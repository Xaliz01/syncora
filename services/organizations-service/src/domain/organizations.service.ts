import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { OrganizationDocument } from "../persistence/organization.schema";
import {
  activeDocumentFilter,
  type OrganizationResponse,
  type UpdateOrganizationBody
} from "@syncora/shared";
import { AbstractOrganizationsService } from "./ports/organizations.service.port";

@Injectable()
export class OrganizationsService extends AbstractOrganizationsService {
  constructor(
    @InjectModel("Organization")
    private readonly organizationModel: Model<OrganizationDocument>
  ) {
    super();
  }

  private toResponse(doc: OrganizationDocument): OrganizationResponse {
    return {
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      phone: doc.phone,
      addressLine1: doc.addressLine1,
      addressLine2: doc.addressLine2,
      postalCode: doc.postalCode,
      city: doc.city,
      country: doc.country,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }

  async create(name: string): Promise<OrganizationResponse> {
    const doc = await this.organizationModel.create({ name });
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
}
