import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { SupportImpersonationAuditDocument } from "../persistence/support-impersonation-audit.schema";
import {
  AbstractImpersonationAuditService,
  type CreateImpersonationAuditBody,
} from "./ports/impersonation-audit.service.port";

@Injectable()
export class ImpersonationAuditService extends AbstractImpersonationAuditService {
  constructor(
    @InjectModel("SupportImpersonationAudit")
    private readonly impersonationAuditModel: Model<SupportImpersonationAuditDocument>,
  ) {
    super();
  }

  async createImpersonationAudit(body: CreateImpersonationAuditBody): Promise<{ id: string }> {
    const doc = await this.impersonationAuditModel.create({
      impersonatorUserId: body.impersonatorUserId,
      impersonatorEmail: body.impersonatorEmail.trim().toLowerCase(),
      targetUserId: body.targetUserId,
      targetEmail: body.targetEmail.trim().toLowerCase(),
      organizationId: body.organizationId,
      reason: body.reason.trim(),
      startedAt: new Date(),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
    return { id: doc._id.toString() };
  }
}
