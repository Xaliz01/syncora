import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { AgenceDocument } from "../persistence/agence.schema";
import type { CreateAgenceBody, UpdateAgenceBody, AgenceResponse } from "@planwise/shared";
import { AbstractAgencesService } from "./ports/agences.service.port";
import { toAgenceResponse } from "./mappers/agence.mapper";

@Injectable()
export class AgencesService extends AbstractAgencesService {
  constructor(
    @InjectModel("Agence")
    private readonly agenceModel: Model<AgenceDocument>,
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
        phone: body.phone,
        isTestData: body.isTestData === true,
      });
      return toAgenceResponse(doc);
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
    body: UpdateAgenceBody,
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
    return toAgenceResponse(doc);
  }

  async getAgence(organizationId: string, agenceId: string): Promise<AgenceResponse> {
    const doc = await this.agenceModel.findById(agenceId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Agence introuvable");
    }
    return toAgenceResponse(doc);
  }

  async listAgences(organizationId: string): Promise<AgenceResponse[]> {
    const docs = await this.agenceModel.find({ organizationId }).sort({ name: 1 }).exec();
    return docs.map((doc) => toAgenceResponse(doc));
  }

  async deleteAgence(organizationId: string, agenceId: string): Promise<{ deleted: true }> {
    const doc = await this.agenceModel.findById(agenceId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Agence introuvable");
    }
    await doc.deleteOne();
    return { deleted: true };
  }
}
