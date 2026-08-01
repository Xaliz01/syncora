import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { TechnicianDocument } from "../persistence/technician.schema";
import {
  activeDocumentFilter,
  type CreateTechnicianBody,
  type UpdateTechnicianBody,
  type TechnicianResponse,
  type TechnicianStatus,
} from "@planwise/shared";
import { AbstractTechniciansService } from "./ports/technicians.service.port";

@Injectable()
export class TechniciansService extends AbstractTechniciansService {
  constructor(
    @InjectModel("Technician")
    private readonly technicianModel: Model<TechnicianDocument>,
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
      status: body.status ?? "actif",
      calendarColor: body.calendarColor?.trim()
        ? this.validateCalendarColor(body.calendarColor)
        : undefined,
      isTestData: body.isTestData === true,
    });
    return this.toTechnicianResponse(doc);
  }

  async updateTechnician(
    organizationId: string,
    technicianId: string,
    body: UpdateTechnicianBody,
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
    if (body.calendarColor !== undefined) {
      if (body.calendarColor === null || body.calendarColor.trim() === "") {
        doc.calendarColor = undefined;
      } else {
        doc.calendarColor = this.validateCalendarColor(body.calendarColor);
      }
    }
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

  async deleteTechnician(organizationId: string, technicianId: string): Promise<{ deleted: true }> {
    const result = await this.technicianModel
      .updateOne(
        { _id: technicianId, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } },
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
    userId: string,
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

    const alreadyLinked = await this.technicianModel
      .findOne({ organizationId, userId, ...activeDocumentFilter })
      .exec();
    if (alreadyLinked) {
      throw new ConflictException("Cet utilisateur est déjà lié à un autre technicien");
    }

    doc.userId = userId;
    await doc.save();
    return this.toTechnicianResponse(doc);
  }

  async findByUserId(organizationId: string, userId: string): Promise<TechnicianResponse | null> {
    const doc = await this.technicianModel
      .findOne({ organizationId, userId, ...activeDocumentFilter })
      .exec();
    return doc ? this.toTechnicianResponse(doc) : null;
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
      calendarColor: doc.calendarColor,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
    };
  }

  /** Accepte #RGB ou #RRGGBB ; normalise en #RRGGBB majuscules */
  private validateCalendarColor(raw: string): string {
    const t = raw.trim();
    const short = /^#?([0-9a-fA-F]{3})$/.exec(t);
    if (short) {
      const [r, g, b] = short[1].split("").map((c) => c + c);
      return `#${r}${g}${b}`.toUpperCase();
    }
    const full = /^#?([0-9a-fA-F]{6})$/.exec(t);
    if (full) {
      return `#${full[1]}`.toUpperCase();
    }
    throw new BadRequestException(
      "calendarColor doit être une couleur hexadécimale (#RGB ou #RRGGBB)",
    );
  }
}
