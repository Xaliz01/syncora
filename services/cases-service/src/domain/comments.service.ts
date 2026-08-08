import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  activeDocumentFilter,
  MAX_COMMENT_BODY_LENGTH,
  type CommentEntityType,
  type CommentResponse,
  type CreateCommentBody,
  type UpdateCommentBody,
} from "@planwise/shared";
import type { CaseDocument } from "../persistence/case.schema";
import type { InterventionDocument } from "../persistence/intervention.schema";
import type { CommentDocument } from "../persistence/comment.schema";
import { AbstractCommentsService } from "./ports/comments.service.port";
import { toCommentResponse } from "./mappers/comment.mapper";

@Injectable()
export class CommentsService extends AbstractCommentsService {
  constructor(
    @InjectModel("Comment")
    private readonly commentModel: Model<CommentDocument>,
    @InjectModel("Case")
    private readonly caseModel: Model<CaseDocument>,
    @InjectModel("Intervention")
    private readonly interventionModel: Model<InterventionDocument>,
  ) {
    super();
  }

  async createComment(body: CreateCommentBody): Promise<CommentResponse> {
    const trimmed = body.body?.trim() ?? "";
    if (!trimmed) throw new BadRequestException("Comment body is required");
    if (trimmed.length > MAX_COMMENT_BODY_LENGTH) {
      throw new BadRequestException(
        `Comment body must be at most ${MAX_COMMENT_BODY_LENGTH} characters`,
      );
    }
    if (body.entityType !== "case" && body.entityType !== "intervention") {
      throw new BadRequestException("entityType must be case or intervention");
    }

    const caseId = await this.resolveCommentCaseId(
      body.organizationId,
      body.entityType,
      body.entityId,
    );

    const doc = await this.commentModel.create({
      organizationId: body.organizationId,
      entityType: body.entityType,
      entityId: body.entityId,
      caseId,
      body: trimmed,
      authorId: body.authorId,
      authorName: body.authorName,
    });
    return toCommentResponse(doc);
  }

  async listComments(
    organizationId: string,
    entityType: CommentEntityType,
    entityId: string,
  ): Promise<CommentResponse[]> {
    if (entityType !== "case" && entityType !== "intervention") {
      throw new BadRequestException("entityType must be case or intervention");
    }
    const docs = await this.commentModel
      .find({
        organizationId,
        entityType,
        entityId,
        ...activeDocumentFilter,
      })
      .sort({ createdAt: 1 })
      .limit(500)
      .exec();
    return docs.map((d) => toCommentResponse(d));
  }

  async getComment(id: string, organizationId: string): Promise<CommentResponse> {
    const doc = await this.commentModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Comment not found");
    return toCommentResponse(doc);
  }

  async updateComment(id: string, body: UpdateCommentBody): Promise<CommentResponse> {
    const trimmed = body.body?.trim() ?? "";
    if (!trimmed) throw new BadRequestException("Comment body is required");
    if (trimmed.length > MAX_COMMENT_BODY_LENGTH) {
      throw new BadRequestException(
        `Comment body must be at most ${MAX_COMMENT_BODY_LENGTH} characters`,
      );
    }
    const doc = await this.commentModel
      .findOneAndUpdate(
        { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
        { $set: { body: trimmed } },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Comment not found");
    return toCommentResponse(doc);
  }

  async deleteComment(id: string, organizationId: string): Promise<{ deleted: true }> {
    const result = await this.commentModel
      .updateOne(
        { _id: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
    if (!result.matchedCount) throw new NotFoundException("Comment not found");
    return { deleted: true };
  }

  private async resolveCommentCaseId(
    organizationId: string,
    entityType: CommentEntityType,
    entityId: string,
  ): Promise<string> {
    if (entityType === "case") {
      const caseDoc = await this.caseModel
        .findOne({ _id: entityId, organizationId, ...activeDocumentFilter })
        .select("_id")
        .exec();
      if (!caseDoc) throw new NotFoundException("Case not found");
      return caseDoc._id.toString();
    }
    const intervention = await this.interventionModel
      .findOne({ _id: entityId, organizationId, ...activeDocumentFilter })
      .select("caseId")
      .exec();
    if (!intervention) throw new NotFoundException("Intervention not found");
    return intervention.caseId;
  }
}
