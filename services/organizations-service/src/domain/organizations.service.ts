import { Injectable } from "@nestjs/common";
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
} from "@syncora/shared";
import { AbstractOrganizationsService } from "./ports/organizations.service.port";

@Injectable()
export class OrganizationsService extends AbstractOrganizationsService {
  constructor(
    @InjectModel("Organization")
    private readonly organizationModel: Model<OrganizationDocument>,
  ) {
    super();
  }

  private toResponse(doc: OrganizationDocument): OrganizationResponse {
    return {
      id: doc._id.toString(),
      name: doc.name,
      siret: doc.siret,
      email: doc.email,
      phone: doc.phone,
      addressLine1: doc.addressLine1,
      addressLine2: doc.addressLine2,
      postalCode: doc.postalCode,
      city: doc.city,
      country: doc.country,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      trialTestData: doc.trialTestData
        ? {
            status: doc.trialTestData.status,
            injectedAt: doc.trialTestData.injectedAt?.toISOString(),
            errorMessage: doc.trialTestData.errorMessage ?? null,
          }
        : undefined,
    };
  }

  async create(body: CreateOrganizationBody): Promise<OrganizationResponse> {
    const doc = await this.organizationModel.create({
      name: body.name.trim(),
      siret: body.siret.trim(),
      addressLine1: body.addressLine1?.trim() || undefined,
      addressLine2: body.addressLine2?.trim() || undefined,
      postalCode: body.postalCode?.trim() || undefined,
      city: body.city?.trim() || undefined,
      country: body.country?.trim() || undefined,
    });
    return this.toResponse(doc);
  }

  async findById(id: string): Promise<OrganizationResponse | null> {
    const doc = await this.organizationModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    if (!doc) return null;
    return this.toResponse(doc);
  }

  async update(id: string, body: UpdateOrganizationBody): Promise<OrganizationResponse | null> {
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.email !== undefined) update.email = body.email || null;
    if (body.phone !== undefined) update.phone = body.phone || null;
    if (body.addressLine1 !== undefined) update.addressLine1 = body.addressLine1 || null;
    if (body.addressLine2 !== undefined) update.addressLine2 = body.addressLine2 || null;
    if (body.postalCode !== undefined) update.postalCode = body.postalCode || null;
    if (body.city !== undefined) update.city = body.city || null;
    if (body.country !== undefined) update.country = body.country || null;

    const doc = await this.organizationModel
      .findOneAndUpdate({ _id: id, ...activeDocumentFilter }, { $set: update }, { new: true })
      .exec();
    if (!doc) return null;
    return this.toResponse(doc);
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
