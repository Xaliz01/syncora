import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { TechnicianDocument } from "../../persistence/technicians/technician.schema";
import type { TeamDocument } from "../../persistence/technicians/team.schema";
import type { AgenceDocument } from "../../persistence/technicians/agence.schema";

@Injectable()
export class TestDataPurgeService {
  constructor(
    @InjectModel("Technician", "technicians")
    private readonly technicianModel: Model<TechnicianDocument>,
    @InjectModel("Team", "technicians")
    private readonly teamModel: Model<TeamDocument>,
    @InjectModel("Agence", "technicians")
    private readonly agenceModel: Model<AgenceDocument>,
  ) {}

  async purge(organizationId: string): Promise<{ purged: true }> {
    await this.teamModel.deleteMany({ organizationId, isTestData: true }).exec();
    await this.technicianModel.deleteMany({ organizationId, isTestData: true }).exec();
    await this.agenceModel.deleteMany({ organizationId, isTestData: true }).exec();
    return { purged: true };
  }
}
