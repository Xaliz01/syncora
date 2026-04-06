import {
  Injectable,
  NotFoundException,
  BadRequestException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { TechnicianDocument } from "../persistence/technician.schema";
import {
  activeDocumentFilter,
  type CreateTechnicianBody,
  type UpdateTechnicianBody,
  type TechnicianResponse,
  type TechnicianStatus
} from "@syncora/shared";
import { AbstractTechniciansService } from "./ports/technicians.service.port";

@Injectable()
export class TechniciansService extends AbstractTechniciansService {
  constructor(
    @InjectModel("Technician")
    private readonly technicianModel: Model<TechnicianDocument>
  ) {
    super();
  }

  async createTechnician(body: CreateTechnicianBody): Promise<TechnicianResponse> {
    const doc = await this.technicianModel.create({
      organizationId: body.organizationId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      speciality: body.speciality,
      status: body.status ?? "actif"
    });
    return this.toTechnicianResponse(doc);
  }

  async updateTechnician(
    organizationId: string,
    technicianId: string,
    body: UpdateTechnicianBody
  ): Promise<TechnicianResponse> {
    const doc = await this.technicianModel
      .findOne({ _id: technicianId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) {
      throw new NotFoundException("Technicien introuvable");
    }
    if (body.firstName !== undefined) doc.firstName = body.firstName;
    if (body.lastName !== undefined) doc.lastName = body.lastName;
    if (body.email !== undefined) doc.email = body.email;
    if (body.phone !== undefined) doc.phone = body.phone;
    if (body.speciality !== undefined) doc.speciality = body.speciality;
    if (body.status !== undefined) doc.status = body.status;
    await doc.save();
    return this.toTechnicianResponse(doc);
  }

  async getTechnician(organizationId: string, technicianId: string): Promise<TechnicianResponse> {
    const doc = await this.technicianModel
      .findOne({ _id: technicianId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) {
      throw new NotFoundException("Technicien introuvable");
    }
    return this.toTechnicianResponse(doc);
  }

  async listTechnicians(organizationId: string): Promise<TechnicianResponse[]> {
    const docs = await this.technicianModel
      .find({ organizationId, ...activeDocumentFilter })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toTechnicianResponse(doc));
  }

  async deleteTechnician(
    organizationId: string,
    technicianId: string
  ): Promise<{ deleted: true }> {
    const result = await this.technicianModel
      .updateOne(
        { _id: technicianId, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } }
      )
      .exec();
    if (!result.matchedCount) {
      throw new NotFoundException("Technicien introuvable");
    }
    return { deleted: true };
  }

  async linkUserToTechnician(
    organizationId: string,
    technicianId: string,
    userId: string
  ): Promise<TechnicianResponse> {
    const doc = await this.technicianModel
      .findOne({ _id: technicianId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) {
      throw new NotFoundException("Technicien introuvable");
    }
    if (doc.userId) {
      throw new BadRequestException("Ce technicien a déjà un compte utilisateur associé");
    }
    doc.userId = userId;
    await doc.save();
    return this.toTechnicianResponse(doc);
  }

  private toTechnicianResponse(doc: TechnicianDocument): TechnicianResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      phone: doc.phone,
      speciality: doc.speciality,
      status: doc.status as TechnicianStatus,
      userId: doc.userId,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }
}
