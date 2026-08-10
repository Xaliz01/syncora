import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  clampPagination,
  DATA_IMPORT_MAX_ROWS,
  isDataImportEntity,
  type CreateDataImportRunBody,
  type DataImportRunListResponse,
  type DataImportRunSummary,
} from "@planwise/shared";
import { parseOrganizationIdBody, parseOrganizationIdQuery } from "@planwise/shared/nest";
import type { DataImportRunDocument } from "../persistence/data-import-run.schema";
import { toDataImportRunSummary } from "./mappers/data-import-run.mapper";
import { AbstractDataImportRunsService } from "./ports/data-import-runs.service.port";

@Injectable()
export class DataImportRunsService extends AbstractDataImportRunsService {
  constructor(
    @InjectModel("DataImportRun")
    private readonly runModel: Model<DataImportRunDocument>,
  ) {
    super();
  }

  async create(body: CreateDataImportRunBody): Promise<DataImportRunSummary> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    if (!isDataImportEntity(body.entity)) {
      throw new BadRequestException("entity invalide");
    }
    if (!body.createdByUserId?.trim()) {
      throw new BadRequestException("createdByUserId requis");
    }
    const createdResourceIds = [
      ...new Set((body.createdResourceIds ?? []).map((id) => id.trim()).filter(Boolean)),
    ].slice(0, DATA_IMPORT_MAX_ROWS);

    const doc = await this.runModel.create({
      organizationId,
      entity: body.entity,
      fileName: body.fileName?.trim() || undefined,
      createdByUserId: body.createdByUserId.trim(),
      createdAt: new Date(),
      status: "completed",
      stats: {
        created: body.stats?.created ?? 0,
        updated: body.stats?.updated ?? 0,
        skipped: body.stats?.skipped ?? 0,
        errorCount: body.stats?.errorCount ?? 0,
      },
      createdResourceIds,
    });
    return toDataImportRunSummary(doc);
  }

  async list(
    organizationId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<DataImportRunListResponse> {
    const orgId = parseOrganizationIdQuery(organizationId);
    const { limit, offset } = clampPagination(opts);
    const filter = { organizationId: orgId };
    const [items, total] = await Promise.all([
      this.runModel.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
      this.runModel.countDocuments(filter).exec(),
    ]);
    return {
      items: items.map(toDataImportRunSummary),
      total,
    };
  }

  async findById(organizationId: string, id: string): Promise<DataImportRunSummary | null> {
    const withIds = await this.findByIdWithIds(organizationId, id);
    if (!withIds) return null;
    const { createdResourceIds: _ids, ...summary } = withIds;
    void _ids;
    return summary;
  }

  async findByIdWithIds(
    organizationId: string,
    id: string,
  ): Promise<(DataImportRunSummary & { createdResourceIds: string[] }) | null> {
    const orgId = parseOrganizationIdQuery(organizationId);
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.runModel.findOne({ _id: id, organizationId: orgId }).exec();
    if (!doc) return null;
    return {
      ...toDataImportRunSummary(doc),
      createdResourceIds: [...(doc.createdResourceIds ?? [])],
    };
  }

  async markRolledBack(organizationId: string, id: string): Promise<DataImportRunSummary> {
    const orgId = parseOrganizationIdBody(organizationId);
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Import introuvable");
    }
    const doc = await this.runModel
      .findOneAndUpdate(
        { _id: id, organizationId: orgId, status: "completed" },
        {
          $set: {
            status: "rolled_back",
            rolledBackAt: new Date(),
            createdResourceIds: [],
          },
        },
        { new: true },
      )
      .exec();
    if (!doc) {
      const existing = await this.runModel.findOne({ _id: id, organizationId: orgId }).exec();
      if (!existing) throw new NotFoundException("Import introuvable");
      if (existing.status === "rolled_back") {
        throw new BadRequestException("Cet import a déjà été annulé");
      }
      throw new BadRequestException("Impossible d’annuler cet import");
    }
    return toDataImportRunSummary(doc);
  }
}
