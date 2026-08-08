import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { CaseHistoryEntryResponse, CreateCaseHistoryBody } from "@planwise/shared";
import type { CaseHistoryDocument } from "../persistence/case-history.schema";
import { AbstractCaseHistoryService } from "./ports/case-history.service.port";
import { toHistoryResponse } from "./mappers/case-history.mapper";

@Injectable()
export class CaseHistoryService extends AbstractCaseHistoryService {
  constructor(
    @InjectModel("CaseHistory")
    private readonly caseHistoryModel: Model<CaseHistoryDocument>,
  ) {
    super();
  }

  async addCaseHistory(body: CreateCaseHistoryBody): Promise<CaseHistoryEntryResponse> {
    const doc = await this.caseHistoryModel.create({
      organizationId: body.organizationId,
      caseId: body.caseId,
      actorId: body.actorId,
      actorName: body.actorName,
      action: body.action,
      details: body.details,
      changes: body.changes ?? [],
    });
    return toHistoryResponse(doc);
  }

  async listCaseHistory(
    caseId: string,
    organizationId: string,
  ): Promise<CaseHistoryEntryResponse[]> {
    const docs = await this.caseHistoryModel
      .find({ caseId, organizationId })
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();
    return docs.map((d) => toHistoryResponse(d));
  }
}
