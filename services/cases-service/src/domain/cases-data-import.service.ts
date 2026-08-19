import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  activeDocumentFilter,
  buildCaseDisplayTitle,
  type CasePriority,
  type CaseStatus,
  type DataImportBulkResult,
  type DataImportDeleteCreatedBody,
  type DataImportDeleteCreatedResult,
  type ImportCasesBody,
  type ImportInterventionsBody,
  type InterventionStatus,
} from "@planwise/shared";
import { parseOrganizationIdBody } from "@planwise/shared/nest";
import type { CaseDocument } from "../persistence/case.schema";
import type { InterventionDocument } from "../persistence/intervention.schema";
import type { InterventionTypeDocument } from "../persistence/intervention-type.schema";
import { AbstractCasesDataImportService } from "./ports/cases-data-import.service.port";
import { generateCaseNumber } from "./utils/case-number.utils";
import { isDuplicateKeyError } from "./utils";

const CASE_STATUSES: CaseStatus[] = [
  "draft",
  "open",
  "in_progress",
  "waiting",
  "completed",
  "cancelled",
];
const CASE_PRIORITIES: CasePriority[] = ["low", "medium", "high", "urgent"];
const INTERVENTION_STATUSES: InterventionStatus[] = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
];

function emptyResult(): DataImportBulkResult {
  return { created: 0, updated: 0, skipped: 0, errors: [], mappings: [] };
}

function parseOptionalDate(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

@Injectable()
export class CasesDataImportService extends AbstractCasesDataImportService {
  constructor(
    @InjectModel("Case")
    private readonly caseModel: Model<CaseDocument>,
    @InjectModel("Intervention")
    private readonly interventionModel: Model<InterventionDocument>,
    @InjectModel("InterventionType")
    private readonly interventionTypeModel: Model<InterventionTypeDocument>,
  ) {
    super();
  }

  async importCases(body: ImportCasesBody): Promise<DataImportBulkResult> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const result = emptyResult();

    for (let i = 0; i < body.rows.length; i += 1) {
      const row = body.rows[i]!;
      const rowNum = i + 2;
      if (!row.externalId?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "externalId",
          message: "externalId requis",
          severity: "error",
        });
        continue;
      }
      if (!row.title?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "title",
          message: "title requis",
          severity: "error",
        });
        continue;
      }

      const status = (row.status?.trim() || "draft") as CaseStatus;
      if (!CASE_STATUSES.includes(status)) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "status",
          message: `status invalide : ${row.status}`,
          severity: "error",
        });
        continue;
      }
      const priority = (row.priority?.trim() || "medium") as CasePriority;
      if (!CASE_PRIORITIES.includes(priority)) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "priority",
          message: `priority invalide : ${row.priority}`,
          severity: "error",
        });
        continue;
      }

      let customerId: string | undefined;
      if (row.customerExternalId?.trim()) {
        customerId = body.customerIdByExternalId?.[row.customerExternalId.trim()];
        if (!customerId) {
          result.skipped += 1;
          result.errors.push({
            row: rowNum,
            field: "customerExternalId",
            message: `Client inconnu : ${row.customerExternalId}`,
            severity: "error",
          });
          continue;
        }
      }
      let orderGiverId: string | undefined;
      if (row.orderGiverExternalId?.trim()) {
        orderGiverId = body.orderGiverIdByExternalId?.[row.orderGiverExternalId.trim()];
        if (!orderGiverId) {
          result.skipped += 1;
          result.errors.push({
            row: rowNum,
            field: "orderGiverExternalId",
            message: `Donneur d’ordre inconnu : ${row.orderGiverExternalId}`,
            severity: "error",
          });
          continue;
        }
      }
      let interventionSiteId: string | undefined;
      if (row.siteExternalId?.trim()) {
        interventionSiteId = body.siteIdByExternalId?.[row.siteExternalId.trim()];
        if (!interventionSiteId) {
          result.skipped += 1;
          result.errors.push({
            row: rowNum,
            field: "siteExternalId",
            message: `Site inconnu : ${row.siteExternalId}`,
            severity: "error",
          });
          continue;
        }
      }

      const dueDate = parseOptionalDate(row.dueDate);
      if (row.dueDate?.trim() && !dueDate) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "dueDate",
          message: "dueDate invalide (ISO attendu)",
          severity: "error",
        });
        continue;
      }

      const tags = row.tags
        ? row.tags
            .split("|")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const externalId = row.externalId.trim();
      try {
        const existing = await this.caseModel
          .findOne({ organizationId, importExternalId: externalId, ...activeDocumentFilter })
          .exec();
        const label = row.title.trim();
        if (existing) {
          existing.title = buildCaseDisplayTitle(existing.caseNumber, label);
          existing.description = row.description?.trim() || undefined;
          existing.status = status;
          existing.priority = priority;
          existing.customerId = customerId;
          existing.orderGiverId = orderGiverId;
          existing.interventionSiteId = interventionSiteId;
          existing.dueDate = dueDate;
          existing.tags = tags;
          existing.importExternalId = externalId;
          await existing.save();
          result.updated += 1;
          result.mappings.push({ externalId, id: existing._id.toString(), action: "updated" });
        } else {
          let created = false;
          for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
            try {
              const caseNumber = await generateCaseNumber(this.caseModel, organizationId);
              const doc = await this.caseModel.create({
                organizationId,
                caseNumber,
                title: buildCaseDisplayTitle(caseNumber, label),
                description: row.description?.trim() || undefined,
                status,
                priority,
                customerId,
                orderGiverId,
                interventionSiteId,
                dueDate,
                tags,
                importExternalId: externalId,
                billingStatus: "none",
                assignees: [],
                steps: [],
                interventionCount: 0,
              });
              result.created += 1;
              result.mappings.push({ externalId, id: doc._id.toString(), action: "created" });
              created = true;
            } catch (err) {
              if (!isDuplicateKeyError(err) || attempt === 4) throw err;
            }
          }
        }
      } catch (e) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          message: e instanceof Error ? e.message : "Erreur import dossier",
          severity: "error",
        });
      }
    }
    return result;
  }

  async importInterventions(body: ImportInterventionsBody): Promise<DataImportBulkResult> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const result = emptyResult();

    for (let i = 0; i < body.rows.length; i += 1) {
      const row = body.rows[i]!;
      const rowNum = i + 2;
      if (!row.externalId?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "externalId",
          message: "externalId requis",
          severity: "error",
        });
        continue;
      }
      if (!row.caseExternalId?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "caseExternalId",
          message: "caseExternalId requis",
          severity: "error",
        });
        continue;
      }
      if (!row.title?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "title",
          message: "title requis",
          severity: "error",
        });
        continue;
      }

      const caseId = body.caseIdByExternalId[row.caseExternalId.trim()];
      if (!caseId) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "caseExternalId",
          message: `Dossier inconnu : ${row.caseExternalId}`,
          severity: "error",
        });
        continue;
      }

      const caseDoc = await this.caseModel
        .findOne({ _id: caseId, organizationId, ...activeDocumentFilter })
        .exec();
      if (!caseDoc) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          message: `Dossier introuvable : ${caseId}`,
          severity: "error",
        });
        continue;
      }

      const status = (row.status?.trim() || "planned") as InterventionStatus;
      if (!INTERVENTION_STATUSES.includes(status)) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "status",
          message: `status invalide : ${row.status}`,
          severity: "error",
        });
        continue;
      }

      const startedAt = parseOptionalDate(row.startedAt);
      const completedAt = parseOptionalDate(row.completedAt);
      const scheduledStart = parseOptionalDate(row.scheduledStart);
      const scheduledEnd = parseOptionalDate(row.scheduledEnd);

      if (row.startedAt?.trim() && !startedAt) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "startedAt",
          message: "startedAt invalide",
          severity: "error",
        });
        continue;
      }
      if (row.completedAt?.trim() && !completedAt) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "completedAt",
          message: "completedAt invalide",
          severity: "error",
        });
        continue;
      }
      if (status === "completed" && !completedAt) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "completedAt",
          message: "completedAt requis lorsque status=completed",
          severity: "error",
        });
        continue;
      }
      if (status === "in_progress" && !startedAt) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "startedAt",
          message: "startedAt requis lorsque status=in_progress",
          severity: "error",
        });
        continue;
      }

      const hasAssignee = Boolean(row.assigneeEmail?.trim());
      const hasTeam = Boolean(row.teamName?.trim());
      if (hasAssignee && hasTeam) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          message: "assigneeEmail et teamName sont exclusifs",
          severity: "error",
        });
        continue;
      }

      let assigneeId: string | undefined;
      let assigneeName: string | undefined;
      let assignedTeamId: string | undefined;
      let assignedTeamName: string | undefined;

      if (hasAssignee) {
        const email = row.assigneeEmail!.trim().toLowerCase();
        assigneeId = body.assigneeIdByEmail?.[email];
        if (!assigneeId) {
          result.errors.push({
            row: rowNum,
            field: "assigneeEmail",
            message: `Technicien introuvable pour ${email} — intervention sans assignation`,
            severity: "warning",
          });
        } else {
          assigneeName = row.assigneeEmail!.trim();
        }
      }
      if (hasTeam) {
        const teamKey = row.teamName!.trim().toLowerCase();
        assignedTeamId = body.teamIdByName?.[teamKey];
        if (!assignedTeamId) {
          result.errors.push({
            row: rowNum,
            field: "teamName",
            message: `Équipe introuvable : ${row.teamName} — intervention sans assignation`,
            severity: "warning",
          });
        } else {
          assignedTeamName = row.teamName!.trim();
        }
      }

      let typeSnapshot: { typeId: string; typeName: string; typeColor?: string } | undefined;
      if (row.typeName?.trim()) {
        typeSnapshot = await this.resolveOrCreateType(
          organizationId,
          row.typeName.trim(),
          row.typeColor?.trim(),
        );
      }

      const externalId = row.externalId.trim();
      try {
        const existing = await this.interventionModel
          .findOne({ organizationId, importExternalId: externalId, ...activeDocumentFilter })
          .exec();
        const fields = {
          caseId,
          title: row.title.trim(),
          description: row.description?.trim() || undefined,
          status,
          scheduledStart,
          scheduledEnd,
          startedAt,
          completedAt,
          notes: row.notes?.trim() || undefined,
          assigneeId,
          assigneeName,
          assignedTeamId,
          assignedTeamName,
          typeId: typeSnapshot?.typeId,
          typeName: typeSnapshot?.typeName,
          typeColor: typeSnapshot?.typeColor,
          importExternalId: externalId,
        };

        if (existing) {
          const prevCaseId = existing.caseId;
          Object.assign(existing, fields);
          await existing.save();
          if (prevCaseId !== caseId) {
            await this.caseModel.updateOne(
              { _id: prevCaseId, organizationId },
              { $inc: { interventionCount: -1 } },
            );
            await this.caseModel.updateOne(
              { _id: caseId, organizationId },
              { $inc: { interventionCount: 1 } },
            );
          }
          result.updated += 1;
          result.mappings.push({ externalId, id: existing._id.toString(), action: "updated" });
        } else {
          const doc = await this.interventionModel.create({
            organizationId,
            ...fields,
            billingStatus: "none",
          });
          await this.caseModel.updateOne(
            { _id: caseId, organizationId },
            { $inc: { interventionCount: 1 } },
          );
          result.created += 1;
          result.mappings.push({ externalId, id: doc._id.toString(), action: "created" });
        }
      } catch (e) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          message: e instanceof Error ? e.message : "Erreur import intervention",
          severity: "error",
        });
      }
    }
    return result;
  }

  async resolveCaseIds(
    organizationId: string,
    externalIds: string[],
  ): Promise<Record<string, string>> {
    const orgId = parseOrganizationIdBody(organizationId);
    const ids = [...new Set(externalIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) return {};
    const docs = await this.caseModel
      .find({
        organizationId: orgId,
        importExternalId: { $in: ids },
        ...activeDocumentFilter,
      })
      .select("_id importExternalId")
      .exec();
    const map: Record<string, string> = {};
    for (const doc of docs) {
      if (doc.importExternalId) map[doc.importExternalId] = doc._id.toString();
    }
    return map;
  }

  async deleteCreated(body: DataImportDeleteCreatedBody): Promise<DataImportDeleteCreatedResult> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const objectIds = [
      ...new Set(
        (body.ids ?? [])
          .map((id) => id.trim())
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id)),
      ),
    ];
    if (objectIds.length === 0) return { deleted: 0 };

    let deleted = 0;
    const chunkSize = 500;
    for (let i = 0; i < objectIds.length; i += chunkSize) {
      const chunk = objectIds.slice(i, i + chunkSize);
      if (body.entity === "cases") {
        const res = await this.caseModel.deleteMany({ organizationId, _id: { $in: chunk } }).exec();
        deleted += res.deletedCount ?? 0;
      } else if (body.entity === "interventions") {
        const res = await this.interventionModel
          .deleteMany({ organizationId, _id: { $in: chunk } })
          .exec();
        deleted += res.deletedCount ?? 0;
      } else {
        throw new Error(`Entité non gérée par cases-service : ${body.entity}`);
      }
    }
    return { deleted };
  }

  private async resolveOrCreateType(
    organizationId: string,
    name: string,
    color?: string,
  ): Promise<{ typeId: string; typeName: string; typeColor?: string }> {
    const existing = await this.interventionTypeModel
      .findOne({ organizationId, name, ...activeDocumentFilter })
      .exec();
    if (existing) {
      return {
        typeId: existing._id.toString(),
        typeName: existing.name,
        typeColor: existing.color,
      };
    }
    const hex = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#6366f1";
    const created = await this.interventionTypeModel.create({
      organizationId,
      name,
      color: hex,
    });
    return {
      typeId: created._id.toString(),
      typeName: created.name,
      typeColor: created.color,
    };
  }
}
