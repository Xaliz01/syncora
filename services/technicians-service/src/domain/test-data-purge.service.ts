import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { TechnicianDocument } from "../persistence/technician.schema";
import type { TeamDocument } from "../persistence/team.schema";
import type { AgenceDocument } from "../persistence/agence.schema";

@Injectable()
export class TestDataPurgeService {
  constructor(
    @InjectModel("Technician")
    private readonly technicianModel: Model<TechnicianDocument>,
    @InjectModel("Team")
    private readonly teamModel: Model<TeamDocument>,
    @InjectModel("Agence")
    private readonly agenceModel: Model<AgenceDocument>,
  ) {}

  async purge(organizationId: string): Promise<{ purged: true }> {
    await this.teamModel.deleteMany({ organizationId, isTestData: true }).exec();
    await this.technicianModel.deleteMany({ organizationId, isTestData: true }).exec();
    await this.agenceModel.deleteMany({ organizationId, isTestData: true }).exec();
    return { purged: true };
  }
}
