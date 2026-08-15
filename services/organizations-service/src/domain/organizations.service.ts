import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { OrganizationDocument } from "../persistence/organization.schema";
import {
  activeDocumentFilter,
  type CreateOrganizationBody,
  type OrganizationResponse,
  type TrialTestDataStatus,
  type TrialTestDataStatusResponse,
  type UpdateOrganizationBody,
  type UpdateOrganizationTrialTestDataBody,
  platformMetricsExcludedEmailDomainRegex,
} from "@planwise/shared";
import { AbstractOrganizationsService } from "./ports/organizations.service.port";
import { toOrganizationResponse } from "./mappers/organization.mapper";

function requireBillingEmail(raw: string | null | undefined): string {
  const email = raw?.trim() ?? "";
  if (!email || !email.includes("@")) {
    throw new BadRequestException("L’e-mail de facturation de l’organisation est requis");
  }
  return email;
}

@Injectable()
export class OrganizationsService extends AbstractOrganizationsService {
  constructor(
    @InjectModel("Organization")
    private readonly organizationModel: Model<OrganizationDocument>,
  ) {
    super();
  }

  async create(body: CreateOrganizationBody): Promise<OrganizationResponse> {
    const email = requireBillingEmail(body.email);
    const doc = await this.organizationModel.create({
      name: body.name.trim(),
      siret: body.siret.trim(),
      email,
      addressLine1: body.addressLine1?.trim() || undefined,
      addressLine2: body.addressLine2?.trim() || undefined,
      postalCode: body.postalCode?.trim() || undefined,
      city: body.city?.trim() || undefined,
      country: body.country?.trim() || undefined,
    });
    return toOrganizationResponse(doc);
  }

  async findById(id: string): Promise<OrganizationResponse | null> {
    const doc = await this.organizationModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    if (!doc) return null;
    return toOrganizationResponse(doc);
  }

  async update(id: string, body: UpdateOrganizationBody): Promise<OrganizationResponse | null> {
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.email !== undefined) update.email = requireBillingEmail(body.email);
    if (body.phone !== undefined) update.phone = body.phone || null;
    if (body.addressLine1 !== undefined) update.addressLine1 = body.addressLine1 || null;
    if (body.addressLine2 !== undefined) update.addressLine2 = body.addressLine2 || null;
    if (body.postalCode !== undefined) update.postalCode = body.postalCode || null;
    if (body.city !== undefined) update.city = body.city || null;
    if (body.country !== undefined) update.country = body.country || null;
    if (body.logoDocumentId !== undefined) {
      update.logoDocumentId = body.logoDocumentId?.trim() || null;
    }

    const doc = await this.organizationModel
      .findOneAndUpdate({ _id: id, ...activeDocumentFilter }, { $set: update }, { new: true })
      .exec();
    if (!doc) return null;
    return toOrganizationResponse(doc);
  }

  async getTrialTestDataStatus(organizationId: string): Promise<TrialTestDataStatusResponse> {
    const doc = await this.organizationModel.findOne({
      _id: organizationId,
      ...activeDocumentFilter,
    });
    if (!doc) {
      return { status: "none", hasTestData: false, injectedAt: null };
    }
    return this.buildTrialTestDataStatus(doc);
  }

  async updateTrialTestData(
    organizationId: string,
    body: UpdateOrganizationTrialTestDataBody,
  ): Promise<TrialTestDataStatusResponse> {
    const update: Record<string, unknown> = {
      "trialTestData.status": body.status,
    };
    if (body.injectedAt !== undefined) {
      update["trialTestData.injectedAt"] =
        body.injectedAt === null ? null : new Date(body.injectedAt);
    }
    if (body.errorMessage !== undefined) {
      update["trialTestData.errorMessage"] = body.errorMessage;
    }
    const doc = await this.organizationModel
      .findOneAndUpdate(
        { _id: organizationId, ...activeDocumentFilter },
        { $set: update },
        { new: true },
      )
      .exec();
    if (!doc) {
      return { status: "none", hasTestData: false, injectedAt: null };
    }
    return this.buildTrialTestDataStatus(doc);
  }

  async listOrganizationsWithReadyTrialTestData(): Promise<string[]> {
    const docs = await this.organizationModel
      .find({
        ...activeDocumentFilter,
        "trialTestData.status": "ready",
      })
      .select("_id")
      .exec();
    return docs.map((d) => d._id.toString());
  }

  async listOrganizations(filters?: {
    search?: string;
    includeTestAccounts?: boolean;
    excludeOrganizationIds?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ organizations: OrganizationResponse[]; total: number }> {
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);
    const query: Record<string, unknown> = { ...activeDocumentFilter };
    if (!filters?.includeTestAccounts) {
      query.email = { $not: platformMetricsExcludedEmailDomainRegex() };
    }
    const excludeIds = [
      ...new Set((filters?.excludeOrganizationIds ?? []).map((id) => id.trim()).filter(Boolean)),
    ];
    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }
    const search = filters?.search?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { siret: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { city: { $regex: escaped, $options: "i" } },
      ];
    }

    const [total, docs] = await Promise.all([
      this.organizationModel.countDocuments(query).exec(),
      this.organizationModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
    ]);

    return {
      organizations: docs.map((doc) => toOrganizationResponse(doc)),
      total,
    };
  }

  async getPlatformDashboardStats(options?: { extraExcludeOrganizationIds?: string[] }): Promise<{
    organizationCount: number;
    excludedOrganizationIds: string[];
  }> {
    const excludedEmailRe = platformMetricsExcludedEmailDomainRegex();
    const base = { ...activeDocumentFilter };
    const emailExcludedDocs = await this.organizationModel
      .find({
        ...base,
        email: excludedEmailRe,
      })
      .select("_id")
      .lean()
      .exec();
    const excludedOrganizationIds = [
      ...new Set([
        ...emailExcludedDocs.map((d) => String(d._id)),
        ...(options?.extraExcludeOrganizationIds ?? []).map((id) => id.trim()).filter(Boolean),
      ]),
    ];
    const organizationCount = await this.organizationModel
      .countDocuments({
        ...base,
        email: { $not: excludedEmailRe },
        ...(excludedOrganizationIds.length > 0 ? { _id: { $nin: excludedOrganizationIds } } : {}),
      })
      .exec();
    return {
      organizationCount,
      excludedOrganizationIds,
    };
  }

  private buildTrialTestDataStatus(doc: OrganizationDocument): TrialTestDataStatusResponse {
    const status: TrialTestDataStatus = doc.trialTestData?.status ?? "none";
    const hasTestData = status === "ready" || status === "injecting";
    return {
      status,
      hasTestData,
      injectedAt: doc.trialTestData?.injectedAt?.toISOString() ?? null,
      errorMessage: doc.trialTestData?.errorMessage ?? null,
    };
  }
}
