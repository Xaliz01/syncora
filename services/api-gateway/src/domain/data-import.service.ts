import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type {
  AuthUser,
  DataImportBulkResult,
  DataImportDeleteCreatedResult,
  DataImportEntity,
  DataImportRollbackResponse,
  DataImportRowError,
  DataImportRunListResponse,
  DataImportRunResponse,
  DataImportRunSummary,
  DataImportSuggestMappingRequest,
  DataImportSuggestMappingResponse,
  DataImportValidateResponse,
  TeamResponse,
  UserResponse,
} from "@planwise/shared";
import {
  DATA_IMPORT_BATCH_SIZE,
  DATA_IMPORT_MAX_FILE_BYTES,
  isDataImportEntity,
} from "@planwise/shared";
import { AssistantLlmClient } from "../infrastructure/assistant/llm.client";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";
import { AbstractDataImportService } from "./ports/data-import.service.port";
import {
  assertCsvLimits,
  mapArticleRows,
  mapCaseRows,
  mapCustomerRows,
  mapCustomerSiteRows,
  mapInterventionRows,
  mapOrderGiverRows,
  mapPrestationRows,
  parseCsv,
  validateHeaders,
} from "./data-import-csv";
import {
  buildMappingSystemPrompt,
  buildMappingUserPrompt,
  fillMappingGaps,
  heuristicSuggestMapping,
  mappingConfidence,
  parseLlmMappingPayload,
  sanitizeMapping,
} from "./data-import-mapping";

function emptyBulk(): DataImportBulkResult {
  return { created: 0, updated: 0, skipped: 0, errors: [], mappings: [] };
}

function mergeBulk(into: DataImportBulkResult, part: DataImportBulkResult, rowOffset: number) {
  into.created += part.created;
  into.updated += part.updated;
  into.skipped += part.skipped;
  into.mappings.push(...part.mappings);
  for (const err of part.errors) {
    into.errors.push({
      ...err,
      // MS renvoie i+2 relatif au lot ; décalage pour n° de ligne fichier.
      row: err.row > 0 ? err.row + rowOffset : err.row,
    });
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

@Injectable()
export class DataImportService extends AbstractDataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    private readonly scopedHttp: OrganizationScopedHttpClient,
    private readonly llm: AssistantLlmClient,
  ) {
    super();
  }

  async suggestMapping(
    user: AuthUser,
    body: DataImportSuggestMappingRequest,
  ): Promise<DataImportSuggestMappingResponse> {
    void user;
    if (!isDataImportEntity(body.entity)) {
      throw new BadRequestException("entity invalide");
    }
    const headers = Array.isArray(body.headers)
      ? body.headers.map((h) => String(h ?? "").trim()).filter(Boolean)
      : [];
    if (headers.length === 0) {
      throw new BadRequestException("headers est requis");
    }
    if (headers.length > 80) {
      throw new BadRequestException("Trop de colonnes (max 80)");
    }
    const sampleRows = Array.isArray(body.sampleRows) ? body.sampleRows.slice(0, 8) : [];

    const fallback = heuristicSuggestMapping(body.entity, headers);
    if (!this.llm.isConfigured()) {
      return fallback;
    }

    try {
      const { content } = await this.llm.complete(
        buildMappingSystemPrompt(body.entity),
        buildMappingUserPrompt({ headers, sampleRows }),
        { rawUserMessage: true },
      );
      const parsed = parseLlmMappingPayload(content);
      if (!parsed?.mapping) {
        return { ...fallback, notes: "IA indisponible — proposition automatique utilisée." };
      }
      const mapping = sanitizeMapping(body.entity, headers, parsed.mapping);
      const confidence =
        parsed.confidence === "high" ||
        parsed.confidence === "medium" ||
        parsed.confidence === "low"
          ? parsed.confidence
          : mappingConfidence(body.entity, mapping);
      const notes =
        typeof parsed.notes === "string" && parsed.notes.trim()
          ? parsed.notes.trim().slice(0, 500)
          : undefined;
      return {
        mapping: fillMappingGaps(body.entity, headers, mapping),
        confidence,
        notes,
        usedLlm: true,
      };
    } catch (err) {
      this.logger.warn(
        `suggestMapping LLM fallback: ${err instanceof Error ? err.message : "error"}`,
      );
      return {
        ...fallback,
        notes: "IA indisponible — proposition automatique utilisée.",
      };
    }
  }

  async validate(
    user: AuthUser,
    entity: DataImportEntity,
    file: Express.Multer.File,
  ): Promise<DataImportValidateResponse> {
    void user;
    const { rows, headerErrors, limitError } = this.parseAndCheck(entity, file);
    const errors: DataImportRowError[] = [...headerErrors];
    if (limitError) errors.push(limitError);

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      const rowNum = i + 2;
      if (!row.externalId?.trim()) {
        errors.push({
          row: rowNum,
          field: "externalId",
          message: "externalId requis",
          severity: "error",
        });
      }
    }

    const errorCount = errors.filter((e) => e.severity === "error").length;
    const warningCount = errors.filter((e) => e.severity === "warning").length;
    return {
      entity,
      totalRows: rows.length,
      validRows: Math.max(0, rows.length - errorCount),
      errorCount,
      warningCount,
      errors: errors.slice(0, 200),
    };
  }

  async run(
    user: AuthUser,
    entity: DataImportEntity,
    file: Express.Multer.File,
  ): Promise<DataImportRunResponse> {
    const { rows, headerErrors, limitError } = this.parseAndCheck(entity, file);
    if (headerErrors.length > 0 || limitError) {
      throw new BadRequestException({
        message: "Fichier invalide — corrigez les erreurs avant d’importer",
        errors: [...headerErrors, ...(limitError ? [limitError] : [])],
      });
    }
    if (rows.length === 0) {
      throw new BadRequestException("Fichier vide (aucune ligne de données)");
    }

    const orgId = user.organizationId;
    let result: DataImportBulkResult;

    switch (entity) {
      case "customers":
        result = await this.postImportBatched(orgId, SERVICE_URLS.customers, "/import/customers", {
          rows: mapCustomerRows(rows),
        });
        break;
      case "customer_sites": {
        const customerExternalIds = [
          ...new Set(rows.map((r) => r.customerExternalId).filter(Boolean)),
        ] as string[];
        const customerIdByExternalId = await this.resolveIds(
          orgId,
          SERVICE_URLS.customers,
          "/import/resolve/customers",
          customerExternalIds,
        );
        result = await this.postImportBatched(
          orgId,
          SERVICE_URLS.customers,
          "/import/customer-sites",
          {
            rows: mapCustomerSiteRows(rows),
            customerIdByExternalId,
          },
        );
        break;
      }
      case "order_givers":
        result = await this.postImportBatched(
          orgId,
          SERVICE_URLS.customers,
          "/import/order-givers",
          {
            rows: mapOrderGiverRows(rows),
          },
        );
        break;
      case "articles":
        result = await this.postImportBatched(orgId, SERVICE_URLS.stock, "/import/articles", {
          rows: mapArticleRows(rows),
        });
        break;
      case "prestations":
        result = await this.postImportBatched(orgId, SERVICE_URLS.stock, "/import/prestations", {
          rows: mapPrestationRows(rows),
        });
        break;
      case "cases": {
        const customerExternalIds = [
          ...new Set(rows.map((r) => r.customerExternalId).filter(Boolean)),
        ] as string[];
        const orderGiverExternalIds = [
          ...new Set(rows.map((r) => r.orderGiverExternalId).filter(Boolean)),
        ] as string[];
        const siteExternalIds = [
          ...new Set(rows.map((r) => r.siteExternalId).filter(Boolean)),
        ] as string[];
        const [customerIdByExternalId, orderGiverIdByExternalId, siteIdByExternalId] =
          await Promise.all([
            this.resolveIds(
              orgId,
              SERVICE_URLS.customers,
              "/import/resolve/customers",
              customerExternalIds,
            ),
            this.resolveIds(
              orgId,
              SERVICE_URLS.customers,
              "/import/resolve/order-givers",
              orderGiverExternalIds,
            ),
            this.resolveIds(
              orgId,
              SERVICE_URLS.customers,
              "/import/resolve/customer-sites",
              siteExternalIds,
            ),
          ]);
        result = await this.postImportBatched(orgId, SERVICE_URLS.cases, "/import/cases", {
          rows: mapCaseRows(rows),
          customerIdByExternalId,
          orderGiverIdByExternalId,
          siteIdByExternalId,
        });
        break;
      }
      case "interventions": {
        const caseExternalIds = [
          ...new Set(rows.map((r) => r.caseExternalId).filter(Boolean)),
        ] as string[];
        const caseIdByExternalId = await this.resolveIds(
          orgId,
          SERVICE_URLS.cases,
          "/import/resolve/cases",
          caseExternalIds,
        );
        const [assigneeIdByEmail, teamIdByName] = await Promise.all([
          this.buildAssigneeEmailMap(orgId),
          this.buildTeamNameMap(orgId),
        ]);
        result = await this.postImportBatched(orgId, SERVICE_URLS.cases, "/import/interventions", {
          rows: mapInterventionRows(rows),
          caseIdByExternalId,
          assigneeIdByEmail,
          teamIdByName,
        });
        break;
      }
      default:
        throw new BadRequestException(`Entité inconnue : ${entity}`);
    }

    return {
      entity,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.slice(0, 200),
      mappings: result.mappings,
      runId: await this.persistRun(user, entity, file.originalname, result),
    };
  }

  async listRuns(
    user: AuthUser,
    opts?: { limit?: number; offset?: number },
  ): Promise<DataImportRunListResponse> {
    return this.scopedHttp.request<DataImportRunListResponse>({
      baseUrl: SERVICE_URLS.organizations,
      organizationId: user.organizationId,
      method: "get",
      path: "/data-import-runs",
      query: {
        ...(opts?.limit != null ? { limit: opts.limit } : {}),
        ...(opts?.offset != null ? { offset: opts.offset } : {}),
      },
      errorLabel: "List data import runs error",
    });
  }

  async rollbackRun(user: AuthUser, runId: string): Promise<DataImportRollbackResponse> {
    if (!runId?.trim()) throw new BadRequestException("runId requis");
    const run = await this.scopedHttp.request<
      DataImportRunSummary & { createdResourceIds: string[] }
    >({
      baseUrl: SERVICE_URLS.organizations,
      organizationId: user.organizationId,
      method: "get",
      path: `/data-import-runs/${encodeURIComponent(runId.trim())}`,
      query: { includeIds: "1" },
      errorLabel: "Get data import run error",
    });
    if (!run) throw new NotFoundException("Import introuvable");
    if (run.status === "rolled_back") {
      throw new BadRequestException("Cet import a déjà été annulé");
    }
    const ids = run.createdResourceIds ?? [];
    if (ids.length === 0) {
      await this.markRunRolledBack(user.organizationId, run.id);
      return {
        runId: run.id,
        entity: run.entity,
        deleted: 0,
        status: "rolled_back",
      };
    }

    const deleted = await this.deleteCreatedResources(user.organizationId, run.entity, ids);
    await this.markRunRolledBack(user.organizationId, run.id);
    return {
      runId: run.id,
      entity: run.entity,
      deleted,
      status: "rolled_back",
    };
  }

  private async persistRun(
    user: AuthUser,
    entity: DataImportEntity,
    fileName: string | undefined,
    result: DataImportBulkResult,
  ): Promise<string | undefined> {
    const createdResourceIds = result.mappings
      .filter((m) => m.action === "created")
      .map((m) => m.id);
    try {
      const saved = await this.scopedHttp.request<DataImportRunSummary>({
        baseUrl: SERVICE_URLS.organizations,
        organizationId: user.organizationId,
        method: "post",
        path: "/data-import-runs",
        body: {
          entity,
          fileName: fileName || undefined,
          createdByUserId: user.id,
          stats: {
            created: result.created,
            updated: result.updated,
            skipped: result.skipped,
            errorCount: result.errors.filter((e) => e.severity === "error").length,
          },
          createdResourceIds,
        },
        errorLabel: "Persist data import run error",
      });
      return saved.id;
    } catch (err) {
      this.logger.warn(
        `Failed to persist import run: ${err instanceof Error ? err.message : "error"}`,
      );
      return undefined;
    }
  }

  private async markRunRolledBack(organizationId: string, runId: string) {
    await this.scopedHttp.request({
      baseUrl: SERVICE_URLS.organizations,
      organizationId,
      method: "patch",
      path: `/data-import-runs/${encodeURIComponent(runId)}/rolled-back`,
      body: {},
      errorLabel: "Mark data import run rolled back error",
    });
  }

  private deleteServiceForEntity(entity: DataImportEntity): string {
    switch (entity) {
      case "customers":
      case "customer_sites":
      case "order_givers":
        return SERVICE_URLS.customers;
      case "articles":
      case "prestations":
        return SERVICE_URLS.stock;
      case "cases":
      case "interventions":
        return SERVICE_URLS.cases;
      default:
        throw new BadRequestException(`Entité inconnue : ${entity}`);
    }
  }

  private async deleteCreatedResources(
    organizationId: string,
    entity: DataImportEntity,
    ids: string[],
  ): Promise<number> {
    const baseUrl = this.deleteServiceForEntity(entity);
    let deleted = 0;
    const chunkSize = 500;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const res = await this.scopedHttp.request<DataImportDeleteCreatedResult>({
        baseUrl,
        organizationId,
        method: "post",
        path: "/import/delete-created",
        body: {
          entity,
          ids: chunk,
        },
        validateResponseScope: false,
        errorLabel: "Delete created import resources error",
        axiosConfig: { timeout: 120_000 },
      });
      deleted += res.deleted ?? 0;
    }
    return deleted;
  }

  private parseAndCheck(entity: DataImportEntity, file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Fichier requis");
    }
    if (file.size > DATA_IMPORT_MAX_FILE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${Math.round(DATA_IMPORT_MAX_FILE_BYTES / (1024 * 1024))} Mo)`,
      );
    }
    const content = file.buffer.toString("utf8");
    const parsed = parseCsv(content);
    const headerErrors = validateHeaders(entity, parsed.headers);
    const limitError = assertCsvLimits(parsed.rows.length);
    return { rows: parsed.rows, headerErrors, limitError };
  }

  /** Envoie les lignes par lots pour rester sous la limite body Express (~100 Ko). */
  private async postImportBatched(
    organizationId: string,
    baseUrl: string,
    path: string,
    body: { rows: unknown[] } & Record<string, unknown>,
  ): Promise<DataImportBulkResult> {
    const { rows, ...rest } = body;
    const merged = emptyBulk();
    const chunks = chunkArray(rows, DATA_IMPORT_BATCH_SIZE);
    for (let c = 0; c < chunks.length; c += 1) {
      const chunk = chunks[c]!;
      const rowOffset = c * DATA_IMPORT_BATCH_SIZE;
      const part = await this.postImport(organizationId, baseUrl, path, {
        ...rest,
        rows: chunk,
      });
      mergeBulk(merged, part, rowOffset);
    }
    return merged;
  }

  private postImport(
    organizationId: string,
    baseUrl: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<DataImportBulkResult> {
    return this.scopedHttp.request<DataImportBulkResult>({
      baseUrl,
      organizationId,
      method: "post",
      path,
      body,
      errorLabel: `Import ${path} error`,
      axiosConfig: { timeout: 120_000 },
      validateResponseScope: false,
    });
  }

  private resolveIds(
    organizationId: string,
    baseUrl: string,
    path: string,
    externalIds: string[],
  ): Promise<Record<string, string>> {
    if (externalIds.length === 0) return Promise.resolve({});
    // Résolution aussi par lots (5000 ids max côté import).
    const chunks = chunkArray(externalIds, 500);
    return (async () => {
      const map: Record<string, string> = {};
      for (const chunk of chunks) {
        const part = await this.scopedHttp.request<Record<string, string>>({
          baseUrl,
          organizationId,
          method: "post",
          path,
          body: { externalIds: chunk },
          errorLabel: `Resolve ${path} error`,
          validateResponseScope: false,
        });
        Object.assign(map, part);
      }
      return map;
    })();
  }

  private async buildAssigneeEmailMap(organizationId: string): Promise<Record<string, string>> {
    const users = await this.scopedHttp.request<UserResponse[]>({
      baseUrl: SERVICE_URLS.users,
      organizationId,
      method: "get",
      path: "/users",
      errorLabel: "Users list error",
    });
    const map: Record<string, string> = {};
    for (const u of users) {
      if (u.email) map[u.email.trim().toLowerCase()] = u.id;
    }
    return map;
  }

  private async buildTeamNameMap(organizationId: string): Promise<Record<string, string>> {
    const teams = await this.scopedHttp.request<TeamResponse[]>({
      baseUrl: SERVICE_URLS.technicians,
      organizationId,
      method: "get",
      path: "/teams",
      errorLabel: "Teams list error",
    });
    const map: Record<string, string> = {};
    for (const t of teams) {
      if (t.name) map[t.name.trim().toLowerCase()] = t.id;
    }
    return map;
  }
}

export function parseDataImportEntity(value: string): DataImportEntity {
  if (!isDataImportEntity(value)) {
    throw new BadRequestException(`Entité d’import invalide : ${value}`);
  }
  return value;
}
