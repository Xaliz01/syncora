import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type {
  AuthUser,
  DataImportBulkResult,
  DataImportEntity,
  DataImportRollbackResponse,
  DataImportRowError,
  DataImportRunListResponse,
  DataImportRunResponse,
  DataImportSuggestMappingRequest,
  DataImportSuggestMappingResponse,
  DataImportValidateResponse,
} from "@planwise/shared";
import {
  DATA_IMPORT_BATCH_SIZE,
  DATA_IMPORT_MAX_FILE_BYTES,
  isDataImportEntity,
} from "@planwise/shared";
import { AssistantLlmClient } from "../infrastructure/assistant/llm.client";
import { AbstractDataImportService } from "./ports/data-import.service.port";
import { AbstractCustomersDataImportService } from "./customers/ports/customers-data-import.service.port";
import { AbstractStockDataImportService } from "./stock/ports/stock-data-import.service.port";
import { AbstractCasesDataImportService } from "./cases/ports/cases-data-import.service.port";
import { AbstractDataImportRunsService } from "./organizations/ports/data-import-runs.service.port";
import { AbstractUsersService } from "./users/ports/users.service.port";
import { AbstractTeamsService } from "./technicians/ports/teams.service.port";
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
    private readonly llm: AssistantLlmClient,
    private readonly customersImport: AbstractCustomersDataImportService,
    private readonly stockImport: AbstractStockDataImportService,
    private readonly casesImport: AbstractCasesDataImportService,
    private readonly importRuns: AbstractDataImportRunsService,
    private readonly users: AbstractUsersService,
    private readonly teams: AbstractTeamsService,
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
        result = await this.importBatched(mapCustomerRows(rows), (chunk) =>
          this.customersImport.importCustomers({ organizationId: orgId, rows: chunk }),
        );
        break;
      case "customer_sites": {
        const customerExternalIds = [
          ...new Set(rows.map((r) => r.customerExternalId).filter(Boolean)),
        ] as string[];
        const { idByExternalId: customerIdByExternalId } = await this.resolveCustomers(
          orgId,
          customerExternalIds,
        );
        result = await this.importBatched(mapCustomerSiteRows(rows), (chunk) =>
          this.customersImport.importCustomerSites({
            organizationId: orgId,
            rows: chunk,
            customerIdByExternalId,
          }),
        );
        break;
      }
      case "order_givers":
        result = await this.importBatched(mapOrderGiverRows(rows), (chunk) =>
          this.customersImport.importOrderGivers({ organizationId: orgId, rows: chunk }),
        );
        break;
      case "articles":
        result = await this.importBatched(mapArticleRows(rows), (chunk) =>
          this.stockImport.importArticles({ organizationId: orgId, rows: chunk }),
        );
        break;
      case "prestations":
        result = await this.importBatched(mapPrestationRows(rows), (chunk) =>
          this.stockImport.importPrestations({ organizationId: orgId, rows: chunk }),
        );
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
        const [customersResolved, orderGiverIdByExternalId, siteIdByExternalId] = await Promise.all(
          [
            this.resolveCustomers(orgId, customerExternalIds),
            this.resolveOrderGiverIds(orgId, orderGiverExternalIds),
            this.resolveSiteIds(orgId, siteExternalIds),
          ],
        );
        result = await this.importBatched(mapCaseRows(rows), (chunk) =>
          this.casesImport.importCases({
            organizationId: orgId,
            rows: chunk,
            customerIdByExternalId: customersResolved.idByExternalId,
            customerDisplayNameByExternalId: customersResolved.displayNameByExternalId,
            orderGiverIdByExternalId,
            siteIdByExternalId,
          }),
        );
        break;
      }
      case "interventions": {
        const caseExternalIds = [
          ...new Set(rows.map((r) => r.caseExternalId).filter(Boolean)),
        ] as string[];
        const caseIdByExternalId = await this.resolveCaseIds(orgId, caseExternalIds);
        const [assigneeIdByEmail, teamIdByName] = await Promise.all([
          this.buildAssigneeEmailMap(orgId),
          this.buildTeamNameMap(orgId),
        ]);
        result = await this.importBatched(mapInterventionRows(rows), (chunk) =>
          this.casesImport.importInterventions({
            organizationId: orgId,
            rows: chunk,
            caseIdByExternalId,
            assigneeIdByEmail,
            teamIdByName,
          }),
        );
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
    return this.importRuns.list(user.organizationId, opts);
  }

  async rollbackRun(user: AuthUser, runId: string): Promise<DataImportRollbackResponse> {
    if (!runId?.trim()) throw new BadRequestException("runId requis");
    const run = await this.importRuns.findByIdWithIds(user.organizationId, runId.trim());
    if (!run) throw new NotFoundException("Import introuvable");
    if (run.status === "rolled_back") {
      throw new BadRequestException("Cet import a déjà été annulé");
    }
    const ids = run.createdResourceIds ?? [];
    if (ids.length === 0) {
      await this.importRuns.markRolledBack(user.organizationId, run.id);
      return {
        runId: run.id,
        entity: run.entity,
        deleted: 0,
        status: "rolled_back",
      };
    }

    const deleted = await this.deleteCreatedResources(user.organizationId, run.entity, ids);
    await this.importRuns.markRolledBack(user.organizationId, run.id);
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
      const saved = await this.importRuns.create({
        organizationId: user.organizationId,
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
      });
      return saved.id;
    } catch (err) {
      this.logger.warn(
        `Failed to persist import run: ${err instanceof Error ? err.message : "error"}`,
      );
      return undefined;
    }
  }

  private async deleteCreatedResources(
    organizationId: string,
    entity: DataImportEntity,
    ids: string[],
  ): Promise<number> {
    let deleted = 0;
    const chunkSize = 500;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const body = { organizationId, entity, ids: chunk };
      const res =
        entity === "articles" || entity === "prestations"
          ? await this.stockImport.deleteCreated(body)
          : entity === "cases" || entity === "interventions"
            ? await this.casesImport.deleteCreated(body)
            : await this.customersImport.deleteCreated(body);
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

  /** Envoie les lignes par lots pour rester sous la limite d’un appel (même taille qu’avant). */
  private async importBatched<TRow>(
    rows: TRow[],
    send: (chunk: TRow[]) => Promise<DataImportBulkResult>,
  ): Promise<DataImportBulkResult> {
    const merged = emptyBulk();
    const chunks = chunkArray(rows, DATA_IMPORT_BATCH_SIZE);
    for (let c = 0; c < chunks.length; c += 1) {
      const chunk = chunks[c]!;
      const rowOffset = c * DATA_IMPORT_BATCH_SIZE;
      const part = await send(chunk);
      mergeBulk(merged, part, rowOffset);
    }
    return merged;
  }

  private async resolveCustomers(
    organizationId: string,
    externalIds: string[],
  ): Promise<{
    idByExternalId: Record<string, string>;
    displayNameByExternalId: Record<string, string>;
  }> {
    if (externalIds.length === 0) {
      return { idByExternalId: {}, displayNameByExternalId: {} };
    }
    const chunks = chunkArray(externalIds, 500);
    const idByExternalId: Record<string, string> = {};
    const displayNameByExternalId: Record<string, string> = {};
    for (const chunk of chunks) {
      const part = await this.customersImport.resolveCustomerIds(organizationId, chunk);
      for (const [externalId, ref] of Object.entries(part ?? {})) {
        if (!ref?.id) continue;
        idByExternalId[externalId] = ref.id;
        if (ref.displayName?.trim()) {
          displayNameByExternalId[externalId] = ref.displayName.trim();
        }
      }
    }
    return { idByExternalId, displayNameByExternalId };
  }

  private resolveOrderGiverIds(organizationId: string, externalIds: string[]) {
    return this.resolveIdMap(externalIds, (chunk) =>
      this.customersImport.resolveOrderGiverIds(organizationId, chunk),
    );
  }

  private resolveSiteIds(organizationId: string, externalIds: string[]) {
    return this.resolveIdMap(externalIds, (chunk) =>
      this.customersImport.resolveSiteIds(organizationId, chunk),
    );
  }

  private resolveCaseIds(organizationId: string, externalIds: string[]) {
    return this.resolveIdMap(externalIds, (chunk) =>
      this.casesImport.resolveCaseIds(organizationId, chunk),
    );
  }

  private async resolveIdMap(
    externalIds: string[],
    resolve: (chunk: string[]) => Promise<Record<string, string>>,
  ): Promise<Record<string, string>> {
    if (externalIds.length === 0) return {};
    const chunks = chunkArray(externalIds, 500);
    const map: Record<string, string> = {};
    for (const chunk of chunks) {
      Object.assign(map, await resolve(chunk));
    }
    return map;
  }

  private async buildAssigneeEmailMap(organizationId: string): Promise<Record<string, string>> {
    const users = await this.users.listByOrganization(organizationId);
    const map: Record<string, string> = {};
    for (const u of users) {
      if (u.email) map[u.email.trim().toLowerCase()] = u.id;
    }
    return map;
  }

  private async buildTeamNameMap(organizationId: string): Promise<Record<string, string>> {
    const teams = await this.teams.listTeams(organizationId);
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
