import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { AgenceDocument } from "../persistence/agence.schema";
import type {
  CreateAgenceBody,
  UpdateAgenceBody,
  AgenceResponse
} from "@syncora/shared";
import { AbstractAgencesService } from "./ports/agences.service.port";

@Injectable()
export class AgencesService extends AbstractAgencesService {
  constructor(
    @InjectModel("Agence")
    private readonly agenceModel: Model<AgenceDocument>
  ) {
    super();
  }

  async createAgence(body: CreateAgenceBody): Promise<AgenceResponse> {
    try {
      const doc = await this.agenceModel.create({
        organizationId: body.organizationId,
        name: body.name,
        address: body.address,
        city: body.city,
        postalCode: body.postalCode,
        phone: body.phone
      });
      return this.toResponse(doc);
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException("Une agence avec ce nom existe déjà");
      }
      throw err;
    }
  }

  async updateAgence(
    organizationId: string,
    agenceId: string,
    body: UpdateAgenceBody
  ): Promise<AgenceResponse> {
    const doc = await this.agenceModel.findById(agenceId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Agence introuvable");
    }
    if (body.name !== undefined) doc.name = body.name;
    if (body.address !== undefined) doc.address = body.address;
    if (body.city !== undefined) doc.city = body.city;
    if (body.postalCode !== undefined) doc.postalCode = body.postalCode;
    if (body.phone !== undefined) doc.phone = body.phone;
    try {
      await doc.save();
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException("Une agence avec ce nom existe déjà");
      }
      throw err;
    }
    return this.toResponse(doc);
  }

  async getAgence(organizationId: string, agenceId: string): Promise<AgenceResponse> {
    const doc = await this.agenceModel.findById(agenceId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Agence introuvable");
    }
    return this.toResponse(doc);
  }

  async listAgences(organizationId: string): Promise<AgenceResponse[]> {
    const docs = await this.agenceModel
      .find({ organizationId })
      .sort({ name: 1 })
      .exec();
    return docs.map((doc) => this.toResponse(doc));
  }

  async deleteAgence(
    organizationId: string,
    agenceId: string
  ): Promise<{ deleted: true }> {
    const doc = await this.agenceModel.findById(agenceId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Agence introuvable");
    }
    await doc.deleteOne();
    return { deleted: true };
  }

  private toResponse(doc: AgenceDocument): AgenceResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      name: doc.name,
      address: doc.address,
      city: doc.city,
      postalCode: doc.postalCode,
      phone: doc.phone,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }
}
