import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  activeDocumentFilter,
  type CaseTemplateResponse,
  type CreateCaseTemplateBody,
  type UpdateCaseTemplateBody,
} from "@planwise/shared";
import type { CaseTemplateDocument } from "../persistence/case-template.schema";
import { AbstractCaseTemplatesService } from "./ports/case-templates.service.port";
import { toTemplateResponse } from "./mappers/case-template.mapper";
import { isDuplicateKeyError } from "./utils";

@Injectable()
export class CaseTemplatesService extends AbstractCaseTemplatesService {
  constructor(
    @InjectModel("CaseTemplate")
    private readonly templateModel: Model<CaseTemplateDocument>,
  ) {
    super();
  }

  async createTemplate(body: CreateCaseTemplateBody): Promise<CaseTemplateResponse> {
    try {
      const doc = await this.templateModel.create({
        organizationId: body.organizationId,
        name: body.name,
        description: body.description,
        steps: (body.steps ?? []).map((s, i) => ({
          name: s.name,
          description: s.description,
          order: s.order ?? i,
          todos: (s.todos ?? []).map((t) => ({
            label: t.label,
            description: t.description,
            dashboardRule: t.dashboardRule,
          })),
        })),
        isTestData: body.isTestData === true,
      });
      return toTemplateResponse(doc);
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException("A template with this name already exists");
      }
      throw err;
    }
  }

  async listTemplates(organizationId: string): Promise<CaseTemplateResponse[]> {
    const docs = await this.templateModel
      .find({ organizationId, ...activeDocumentFilter })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map((d) => toTemplateResponse(d));
  }

  async getTemplate(id: string, organizationId: string): Promise<CaseTemplateResponse> {
    const doc = await this.templateModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Template not found");
    return toTemplateResponse(doc);
  }

  async updateTemplate(id: string, body: UpdateCaseTemplateBody): Promise<CaseTemplateResponse> {
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.steps !== undefined) {
      update.steps = body.steps.map((s, i) => ({
        name: s.name,
        description: s.description,
        order: s.order ?? i,
        todos: (s.todos ?? []).map((t) => ({
          label: t.label,
          description: t.description,
          dashboardRule: t.dashboardRule,
        })),
      }));
    }
    try {
      const doc = await this.templateModel
        .findOneAndUpdate(
          { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
          { $set: update },
          { new: true },
        )
        .exec();
      if (!doc) throw new NotFoundException("Template not found");
      return toTemplateResponse(doc);
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException("A template with this name already exists");
      }
      throw err;
    }
  }

  async deleteTemplate(id: string, organizationId: string): Promise<{ deleted: true }> {
    const result = await this.templateModel
      .updateOne(
        { _id: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
    if (!result.matchedCount) throw new NotFoundException("Template not found");
    return { deleted: true };
  }
}
