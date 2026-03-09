import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { TeamDocument } from "../persistence/team.schema";
import type { AgenceDocument } from "../persistence/agence.schema";
import type {
  CreateTeamBody,
  UpdateTeamBody,
  TeamResponse,
  TeamStatus
} from "@syncora/shared";
import { AbstractTeamsService } from "./ports/teams.service.port";

@Injectable()
export class TeamsService extends AbstractTeamsService {
  constructor(
    @InjectModel("Team")
    private readonly teamModel: Model<TeamDocument>,
    @InjectModel("Agence")
    private readonly agenceModel: Model<AgenceDocument>
  ) {
    super();
  }

  async createTeam(body: CreateTeamBody): Promise<TeamResponse> {
    try {
      const doc = await this.teamModel.create({
        organizationId: body.organizationId,
        name: body.name,
        agenceId: body.agenceId,
        technicianIds: body.technicianIds ?? [],
        status: body.status ?? "active"
      });
      return this.toResponse(doc);
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException("Une équipe avec ce nom existe déjà");
      }
      throw err;
    }
  }

  async updateTeam(
    organizationId: string,
    teamId: string,
    body: UpdateTeamBody
  ): Promise<TeamResponse> {
    const doc = await this.teamModel.findById(teamId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Équipe introuvable");
    }
    if (body.name !== undefined) doc.name = body.name;
    if (body.agenceId !== undefined) doc.agenceId = body.agenceId ?? undefined;
    if (body.technicianIds !== undefined) doc.technicianIds = body.technicianIds;
    if (body.status !== undefined) doc.status = body.status;
    try {
      await doc.save();
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException("Une équipe avec ce nom existe déjà");
      }
      throw err;
    }
    return this.toResponse(doc);
  }

  async getTeam(organizationId: string, teamId: string): Promise<TeamResponse> {
    const doc = await this.teamModel.findById(teamId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Équipe introuvable");
    }
    return this.toResponse(doc);
  }

  async listTeams(organizationId: string): Promise<TeamResponse[]> {
    const docs = await this.teamModel
      .find({ organizationId })
      .sort({ name: 1 })
      .exec();

    const agenceIds = [...new Set(docs.map((d) => d.agenceId).filter(Boolean))] as string[];
    const agences = agenceIds.length
      ? await this.agenceModel.find({ _id: { $in: agenceIds } }).select("_id name").exec()
      : [];
    const agenceMap = new Map(agences.map((a) => [a._id.toString(), a.name]));

    return docs.map((doc) => this.toResponse(doc, agenceMap.get(doc.agenceId ?? "")));
  }

  async deleteTeam(
    organizationId: string,
    teamId: string
  ): Promise<{ deleted: true }> {
    const doc = await this.teamModel.findById(teamId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Équipe introuvable");
    }
    await doc.deleteOne();
    return { deleted: true };
  }

  async addMember(
    organizationId: string,
    teamId: string,
    technicianId: string
  ): Promise<TeamResponse> {
    const doc = await this.teamModel.findById(teamId).exec();
    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Équipe introuvable");
    }
    if (!doc.technicianIds.includes(technicianId)) {
      doc.technicianIds.push(technicianId);
      await doc.save();
    }
    return this.toResponse(doc);
  }

  async removeMember(
    organizationId: string,
    teamId: string,
    technicianId: string
  ): Promise<TeamResponse> {
    const doc = await this.teamModel
      .findOneAndUpdate(
        { _id: teamId, organizationId },
        { $pull: { technicianIds: technicianId } },
        { new: true }
      )
      .exec();
    if (!doc) throw new NotFoundException("Équipe introuvable");
    return this.toResponse(doc);
  }

  private toResponse(doc: TeamDocument, agenceName?: string): TeamResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      name: doc.name,
      agenceId: doc.agenceId,
      agenceName,
      technicianIds: doc.technicianIds,
      status: doc.status as TeamStatus,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }
}
