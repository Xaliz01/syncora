import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  activeDocumentFilter,
  clampPagination,
  MAX_PAGE_LIMIT_WIDE,
  type CompleteInterventionBody,
  type CompleteInterventionResponse,
  type CreateInterventionBody,
  type InterventionResponse,
  type InterventionsListResponse,
  type SignInterventionBody,
  type SignInterventionResponse,
  type StartInterventionBody,
  type StartInterventionResponse,
  type UpdateInterventionBody,
} from "@planwise/shared";
import type { CaseDocument } from "../persistence/case.schema";
import type { InterventionDocument } from "../persistence/intervention.schema";
import type { CommentDocument } from "../persistence/comment.schema";
import { AbstractInterventionsService } from "./ports/interventions.service.port";
import { toInterventionResponse } from "./mappers/intervention.mapper";

@Injectable()
export class InterventionsService extends AbstractInterventionsService {
  constructor(
    @InjectModel("Intervention")
    private readonly interventionModel: Model<InterventionDocument>,
    @InjectModel("Case")
    private readonly caseModel: Model<CaseDocument>,
    @InjectModel("Comment")
    private readonly commentModel: Model<CommentDocument>,
  ) {
    super();
  }

  private normalizeOptionalId(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private assertExclusiveInterventionAssignment(
    assigneeId?: string | null,
    assignedTeamId?: string | null,
  ): void {
    const assignee = this.normalizeOptionalId(assigneeId ?? undefined);
    const team = this.normalizeOptionalId(assignedTeamId ?? undefined);
    if (assignee && team) {
      throw new BadRequestException(
        "Une intervention ne peut être assignée qu'à une équipe ou à une personne.",
      );
    }
  }

  async createIntervention(body: CreateInterventionBody): Promise<InterventionResponse> {
    const caseDoc = await this.caseModel
      .findOne({
        _id: body.caseId,
        organizationId: body.organizationId,
        ...activeDocumentFilter,
      })
      .exec();
    if (!caseDoc) throw new NotFoundException("Case not found");

    const assigneeId = this.normalizeOptionalId(body.assigneeId);
    const assignedTeamId = this.normalizeOptionalId(body.assignedTeamId);
    this.assertExclusiveInterventionAssignment(assigneeId, assignedTeamId);

    const doc = await this.interventionModel.create({
      organizationId: body.organizationId,
      caseId: body.caseId,
      title: body.title,
      description: body.description,
      ...(assigneeId ? { assigneeId } : {}),
      ...(body.assigneeName?.trim() ? { assigneeName: body.assigneeName.trim() } : {}),
      ...(assignedTeamId ? { assignedTeamId } : {}),
      ...(body.assignedTeamName?.trim() ? { assignedTeamName: body.assignedTeamName.trim() } : {}),
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
      status: "planned",
      isTestData: body.isTestData === true,
    });

    await this.caseModel.updateOne(
      { _id: body.caseId, ...activeDocumentFilter },
      { $inc: { interventionCount: 1 } },
    );

    return toInterventionResponse(doc, caseDoc.title);
  }

  async listInterventions(
    organizationId: string,
    filters?: {
      caseId?: string;
      assigneeId?: string;
      assignedTeamId?: string;
      assignedTeamIds?: string[];
      startDate?: string;
      endDate?: string;
      status?: string;
      unscheduled?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<InterventionsListResponse> {
    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    if (filters?.caseId) query.caseId = filters.caseId;

    const teamIds = [
      ...(filters?.assignedTeamId ? [filters.assignedTeamId] : []),
      ...(filters?.assignedTeamIds ?? []),
    ].filter((id, index, all) => id && all.indexOf(id) === index);

    if (filters?.assigneeId && teamIds.length > 0) {
      query.$or = [{ assigneeId: filters.assigneeId }, { assignedTeamId: { $in: teamIds } }];
    } else if (filters?.assigneeId) {
      query.assigneeId = filters.assigneeId;
    } else if (teamIds.length === 1) {
      query.assignedTeamId = teamIds[0];
    } else if (teamIds.length > 1) {
      query.assignedTeamId = { $in: teamIds };
    }
    if (filters?.status) query.status = filters.status;
    if (filters?.search) {
      query.title = { $regex: filters.search, $options: "i" };
    }
    if (filters?.unscheduled) {
      query.$or = [{ scheduledStart: null }, { scheduledStart: { $exists: false } }];
    } else if (filters?.startDate || filters?.endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (filters?.startDate) dateFilter.$gte = new Date(filters.startDate);
      if (filters?.endDate) dateFilter.$lte = new Date(filters.endDate);
      query.scheduledStart = dateFilter;
    }

    const dateBounded = Boolean(filters?.startDate || filters?.endDate);
    const { limit, offset } = clampPagination(
      { limit: filters?.limit, offset: filters?.offset },
      { maxLimit: dateBounded ? MAX_PAGE_LIMIT_WIDE : undefined },
    );

    const [total, docs] = await Promise.all([
      this.interventionModel.countDocuments(query).exec(),
      this.interventionModel
        .find(query)
        .sort({ scheduledStart: 1 })
        .skip(offset)
        .limit(limit)
        .exec(),
    ]);

    const caseIds = [...new Set(docs.map((d) => d.caseId))];
    const cases = await this.caseModel
      .find({ _id: { $in: caseIds }, ...activeDocumentFilter })
      .select("_id title")
      .exec();
    const caseMap = new Map(cases.map((c) => [c._id.toString(), c.title]));

    return {
      interventions: docs.map((d) => toInterventionResponse(d, caseMap.get(d.caseId))),
      total,
    };
  }

  async getIntervention(id: string, organizationId: string): Promise<InterventionResponse> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    const caseDoc = await this.caseModel
      .findOne({ _id: doc.caseId, ...activeDocumentFilter })
      .select("title")
      .exec();
    return toInterventionResponse(doc, caseDoc?.title);
  }

  async updateIntervention(
    id: string,
    body: UpdateInterventionBody,
  ): Promise<InterventionResponse> {
    const existing = await this.interventionModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!existing) throw new NotFoundException("Intervention not found");

    const update: Record<string, unknown> = {};
    const unset: Record<string, string> = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.status !== undefined) update.status = body.status;
    if (body.billingStatus !== undefined) update.billingStatus = body.billingStatus;

    const assigneeTouched = body.assigneeId !== undefined;
    const teamTouched = body.assignedTeamId !== undefined;
    const assigneeId = assigneeTouched ? this.normalizeOptionalId(body.assigneeId) : undefined;
    const assignedTeamId = teamTouched ? this.normalizeOptionalId(body.assignedTeamId) : undefined;

    if (assigneeTouched || teamTouched) {
      const currentAssignee = this.normalizeOptionalId(existing.assigneeId) ?? null;
      const currentTeam = this.normalizeOptionalId(existing.assignedTeamId) ?? null;
      const nextAssignee = assigneeTouched ? (assigneeId ?? null) : currentAssignee;
      const nextTeam = teamTouched ? (assignedTeamId ?? null) : currentTeam;
      if (
        existing.status === "completed" &&
        (nextAssignee !== currentAssignee || nextTeam !== currentTeam)
      ) {
        throw new BadRequestException(
          "Cannot change team or technician assignment on a completed intervention",
        );
      }
    }

    if (existing.status === "completed") {
      const scheduleTouched = body.scheduledStart !== undefined || body.scheduledEnd !== undefined;
      if (scheduleTouched) {
        const currentStart = existing.scheduledStart?.getTime() ?? null;
        const currentEnd = existing.scheduledEnd?.getTime() ?? null;
        const nextStart =
          body.scheduledStart !== undefined
            ? body.scheduledStart
              ? new Date(body.scheduledStart).getTime()
              : null
            : currentStart;
        const nextEnd =
          body.scheduledEnd !== undefined
            ? body.scheduledEnd
              ? new Date(body.scheduledEnd).getTime()
              : null
            : currentEnd;
        if (nextStart !== currentStart || nextEnd !== currentEnd) {
          throw new BadRequestException("Cannot change schedule on a completed intervention");
        }
      }
    }

    if (assigneeTouched && teamTouched) {
      this.assertExclusiveInterventionAssignment(assigneeId, assignedTeamId);
    }

    if (assigneeTouched && assigneeId) {
      update.assigneeId = assigneeId;
      if (body.assigneeName?.trim()) {
        update.assigneeName = body.assigneeName.trim();
      }
      unset.assignedTeamId = "";
      unset.assignedTeamName = "";
    } else if (assigneeTouched) {
      unset.assigneeId = "";
      unset.assigneeName = "";
    }

    if (teamTouched && assignedTeamId) {
      update.assignedTeamId = assignedTeamId;
      if (body.assignedTeamName?.trim()) {
        update.assignedTeamName = body.assignedTeamName.trim();
      }
      unset.assigneeId = "";
      unset.assigneeName = "";
    } else if (teamTouched) {
      unset.assignedTeamId = "";
      unset.assignedTeamName = "";
    }

    if (body.scheduledStart !== undefined) {
      update.scheduledStart = body.scheduledStart ? new Date(body.scheduledStart) : null;
    }
    if (body.scheduledEnd !== undefined) {
      update.scheduledEnd = body.scheduledEnd ? new Date(body.scheduledEnd) : null;
    }
    if (body.notes !== undefined) update.notes = body.notes;

    const mongoUpdate: Record<string, unknown> = {};
    if (Object.keys(update).length > 0) mongoUpdate.$set = update;
    if (Object.keys(unset).length > 0) mongoUpdate.$unset = unset;
    if (Object.keys(mongoUpdate).length === 0) {
      return toInterventionResponse(existing);
    }

    const doc = await this.interventionModel
      .findOneAndUpdate(
        { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
        mongoUpdate,
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    const caseDoc = await this.caseModel
      .findOne({ _id: doc.caseId, ...activeDocumentFilter })
      .select("title")
      .exec();
    return toInterventionResponse(doc, caseDoc?.title);
  }

  async deleteIntervention(id: string, organizationId: string): Promise<{ deleted: true }> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    const now = new Date();
    await this.interventionModel.updateOne({ _id: id }, { $set: { deletedAt: now } });
    await this.commentModel
      .updateMany(
        {
          organizationId,
          entityType: "intervention",
          entityId: id,
          ...activeDocumentFilter,
        },
        { $set: { deletedAt: now } },
      )
      .exec();
    await this.caseModel.updateOne(
      { _id: doc.caseId, ...activeDocumentFilter },
      { $inc: { interventionCount: -1 } },
    );
    return { deleted: true };
  }

  async startIntervention(
    id: string,
    body: StartInterventionBody,
  ): Promise<StartInterventionResponse> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    if (doc.status !== "planned") {
      throw new ConflictException(
        `Cannot start intervention in status "${doc.status}" — only "planned" interventions can be started`,
      );
    }
    const now = new Date();
    const update: Record<string, unknown> = { status: "in_progress", startedAt: now };
    if (body.location) update.startLocation = body.location;
    await this.interventionModel.updateOne({ _id: id }, { $set: update });
    return {
      id: doc._id.toString(),
      status: "in_progress",
      startedAt: now.toISOString(),
      startLocation: body.location,
    };
  }

  async completeIntervention(
    id: string,
    body: CompleteInterventionBody,
  ): Promise<CompleteInterventionResponse> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    if (doc.status !== "in_progress") {
      throw new ConflictException(
        `Cannot complete intervention in status "${doc.status}" — only "in_progress" interventions can be completed`,
      );
    }
    const now = new Date();
    const update: Record<string, unknown> = { status: "completed", completedAt: now };
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.location) update.endLocation = body.location;
    await this.interventionModel.updateOne({ _id: id }, { $set: update });
    return {
      id: doc._id.toString(),
      status: "completed",
      completedAt: now.toISOString(),
      endLocation: body.location,
    };
  }

  async signIntervention(
    id: string,
    body: SignInterventionBody,
  ): Promise<SignInterventionResponse> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    if (doc.status !== "completed") {
      throw new ConflictException(
        `Cannot sign intervention in status "${doc.status}" — only completed interventions can be signed`,
      );
    }
    if (doc.signedAt) {
      throw new ConflictException("Intervention already signed");
    }
    const now = new Date();
    await this.interventionModel.updateOne(
      { _id: id },
      {
        $set: {
          signatoryName: body.signatoryName,
          signatureData: body.signatureData,
          signedAt: now,
        },
      },
    );
    return {
      id: doc._id.toString(),
      signatoryName: body.signatoryName,
      signedAt: now.toISOString(),
    };
  }

  async getInterventionWithSignature(
    id: string,
    organizationId: string,
  ): Promise<{ signatureData?: string; signatoryName?: string }> {
    const doc = await this.interventionModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .select("signatureData signatoryName")
      .exec();
    if (!doc) throw new NotFoundException("Intervention not found");
    return { signatureData: doc.signatureData, signatoryName: doc.signatoryName };
  }

  async listUpcomingInterventions(from: string, to: string): Promise<InterventionResponse[]> {
    const docs = await this.interventionModel
      .find({
        ...activeDocumentFilter,
        status: "planned",
        assigneeId: { $ne: null, $exists: true },
        scheduledStart: { $gte: new Date(from), $lte: new Date(to) },
      })
      .sort({ scheduledStart: 1 })
      .limit(500)
      .exec();

    const caseIds = [...new Set(docs.map((d) => d.caseId))];
    const cases = await this.caseModel
      .find({ _id: { $in: caseIds }, ...activeDocumentFilter })
      .select("_id title")
      .exec();
    const caseMap = new Map(cases.map((c) => [c._id.toString(), c.title]));

    return docs.map((d) => toInterventionResponse(d, caseMap.get(d.caseId)));
  }
}
