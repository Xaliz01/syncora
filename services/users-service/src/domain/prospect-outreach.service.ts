import { Injectable, BadRequestException, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { ProspectOutreachDocument } from "../persistence/prospect-outreach.schema";
import {
  clampPagination,
  PROSPECT_OUTREACH_COMMENT_MAX_LENGTH,
  type CreateProspectOutreachBody,
  type ProspectOutreachResponse,
  type ProspectOutreachStatus,
  type ProspectOutreachesBySirensResponse,
  type ProspectOutreachesListResponse,
  type UpsertProspectCommentBody,
} from "@planwise/shared";
import { AbstractProspectOutreachService } from "./ports/prospect-outreach.service.port";
import { toProspectOutreachResponse } from "./mappers/prospect-outreach.mapper";

@Injectable()
export class ProspectOutreachService extends AbstractProspectOutreachService {
  constructor(
    @InjectModel("ProspectOutreach")
    private readonly prospectOutreachModel: Model<ProspectOutreachDocument>,
  ) {
    super();
  }

  async createProspectOutreach(
    body: CreateProspectOutreachBody,
  ): Promise<ProspectOutreachResponse> {
    const siren = body.siren.trim().replace(/\s/g, "");
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException("SIREN invalide");
    }
    const status: ProspectOutreachStatus =
      body.status === "failed"
        ? "failed"
        : body.status === "email_not_found"
          ? "email_not_found"
          : body.status === "noted"
            ? "noted"
            : "sent";
    const email = body.email.trim().toLowerCase();
    if (status !== "email_not_found" && status !== "noted" && !email.includes("@")) {
      throw new BadRequestException("E-mail invalide");
    }

    const existing = await this.prospectOutreachModel.findOne({ siren }).exec();
    if (existing?.status === "sent" && status === "email_not_found") {
      throw new ConflictException("Cette entreprise a déjà été contactée");
    }

    const sentAt = new Date();
    const $set: Record<string, unknown> = {
      siren,
      companyName: body.companyName.trim(),
      email: status === "email_not_found" || status === "noted" ? email || "" : email,
      sentByUserId: body.sentByUserId,
      sentByEmail: body.sentByEmail.trim().toLowerCase(),
      subject: body.subject.trim(),
      status,
      sentAt,
    };
    if (body.comment !== undefined) {
      $set.comment = this.normalizeProspectComment(body.comment);
    }

    const doc = await this.prospectOutreachModel
      .findOneAndUpdate({ siren }, { $set }, { upsert: true, new: true })
      .exec();
    if (!doc) throw new BadRequestException("Impossible d'enregistrer le contact");
    return toProspectOutreachResponse(doc);
  }

  async upsertProspectComment(body: UpsertProspectCommentBody): Promise<ProspectOutreachResponse> {
    const siren = body.siren.trim().replace(/\s/g, "");
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException("SIREN invalide");
    }
    const comment = this.normalizeProspectComment(body.comment);
    const companyName = body.companyName.trim() || `SIREN ${siren}`;
    const sentByEmail = body.sentByEmail.trim().toLowerCase();
    const existing = await this.prospectOutreachModel.findOne({ siren }).exec();

    if (existing) {
      existing.comment = comment;
      existing.companyName = companyName || existing.companyName;
      existing.sentByUserId = body.sentByUserId;
      existing.sentByEmail = sentByEmail;
      await existing.save();
      return toProspectOutreachResponse(existing);
    }

    const doc = await this.prospectOutreachModel.create({
      siren,
      companyName,
      email: "",
      sentByUserId: body.sentByUserId,
      sentByEmail,
      subject: "Note prospection",
      status: "noted",
      sentAt: new Date(),
      comment,
    });
    return toProspectOutreachResponse(doc);
  }

  async listProspectOutreachesBySirens(
    sirens: string[],
  ): Promise<ProspectOutreachesBySirensResponse> {
    const normalized = [
      ...new Set(sirens.map((s) => s.trim().replace(/\s/g, "")).filter((s) => /^\d{9}$/.test(s))),
    ].slice(0, 200);
    if (normalized.length === 0) return { outreaches: [] };
    const docs = await this.prospectOutreachModel.find({ siren: { $in: normalized } }).exec();
    return { outreaches: docs.map((d) => toProspectOutreachResponse(d)) };
  }

  async listProspectOutreaches(options?: {
    limit?: number;
    offset?: number;
    status?: ProspectOutreachStatus;
    search?: string;
  }): Promise<ProspectOutreachesListResponse> {
    const { limit, offset } = clampPagination(options);
    const query: Record<string, unknown> = {};

    const status = options?.status;
    if (
      status === "sent" ||
      status === "failed" ||
      status === "email_not_found" ||
      status === "noted"
    ) {
      query.status = status;
    }

    const search = options?.search?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const digits = search.replace(/\D/g, "");
      const or: Record<string, unknown>[] = [
        { companyName: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { comment: { $regex: escaped, $options: "i" } },
        { siren: { $regex: escaped, $options: "i" } },
      ];
      if (digits.length > 0 && digits !== search) {
        or.push({ siren: { $regex: digits } });
      }
      query.$or = or;
    }

    const [total, docs] = await Promise.all([
      this.prospectOutreachModel.countDocuments(query).exec(),
      this.prospectOutreachModel.find(query).sort({ sentAt: -1 }).skip(offset).limit(limit).exec(),
    ]);
    return {
      outreaches: docs.map((d) => toProspectOutreachResponse(d)),
      total,
      limit,
      offset,
    };
  }

  private normalizeProspectComment(raw: string): string {
    return raw.trim().slice(0, PROSPECT_OUTREACH_COMMENT_MAX_LENGTH);
  }
}
