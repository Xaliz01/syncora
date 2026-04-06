import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { OrganizationDocument } from "../persistence/organization.schema";
import { activeDocumentFilter, type OrganizationResponse } from "@syncora/shared";
import { AbstractOrganizationsService } from "./ports/organizations.service.port";

@Injectable()
export class OrganizationsService extends AbstractOrganizationsService {
  constructor(
    @InjectModel("Organization")
    private readonly organizationModel: Model<OrganizationDocument>
  ) {
    super();
  }

  async create(name: string): Promise<OrganizationResponse> {
    const doc = await this.organizationModel.create({ name });
    return {
      id: doc._id.toString(),
      name: doc.name,
      createdAt: doc.get("createdAt")?.toISOString()
    };
  }

  async findById(id: string): Promise<OrganizationResponse | null> {
    const doc = await this.organizationModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      name: doc.name,
      createdAt: doc.get("createdAt")?.toISOString()
    };
  }
}
