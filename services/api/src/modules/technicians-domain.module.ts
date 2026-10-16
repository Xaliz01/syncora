import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TechnicianSchema } from "../persistence/technicians/technician.schema";
import { TeamSchema } from "../persistence/technicians/team.schema";
import { AgenceSchema } from "../persistence/technicians/agence.schema";
import { AbstractTechniciansService } from "../domain/technicians/ports/technicians.service.port";
import { TechniciansService } from "../domain/technicians/technicians.service";
import { AbstractTeamsService } from "../domain/technicians/ports/teams.service.port";
import { TeamsService } from "../domain/technicians/teams.service";
import { AbstractAgencesService } from "../domain/technicians/ports/agences.service.port";
import { AgencesService } from "../domain/technicians/agences.service";
import { TestDataPurgeService } from "../domain/technicians/test-data-purge.service";

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: "Technician", schema: TechnicianSchema },
        { name: "Team", schema: TeamSchema },
        { name: "Agence", schema: AgenceSchema },
      ],
      "technicians",
    ),
  ],
  providers: [
    { provide: AbstractTechniciansService, useClass: TechniciansService },
    { provide: AbstractTeamsService, useClass: TeamsService },
    { provide: AbstractAgencesService, useClass: AgencesService },
    TestDataPurgeService,
  ],
  exports: [
    AbstractTechniciansService,
    AbstractTeamsService,
    AbstractAgencesService,
    TestDataPurgeService,
  ],
})
export class TechniciansDomainModule {}
