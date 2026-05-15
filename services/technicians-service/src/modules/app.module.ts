import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TechniciansController } from "../presentation/http/technicians.controller";
import { TeamsController } from "../presentation/http/teams.controller";
import { AgencesController } from "../presentation/http/agences.controller";
import { AbstractTechniciansService } from "../domain/ports/technicians.service.port";
import { AbstractTeamsService } from "../domain/ports/teams.service.port";
import { AbstractAgencesService } from "../domain/ports/agences.service.port";
import { TechniciansService } from "../domain/technicians.service";
import { TeamsService } from "../domain/teams.service";
import { AgencesService } from "../domain/agences.service";
import { TechnicianSchema } from "../persistence/technician.schema";
import { TeamSchema } from "../persistence/team.schema";
import { AgenceSchema } from "../persistence/agence.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-technicians",
    ),
    MongooseModule.forFeature([
      { name: "Technician", schema: TechnicianSchema },
      { name: "Team", schema: TeamSchema },
      { name: "Agence", schema: AgenceSchema },
    ]),
  ],
  controllers: [TechniciansController, TeamsController, AgencesController],
  providers: [
    { provide: AbstractTechniciansService, useClass: TechniciansService },
    { provide: AbstractTeamsService, useClass: TeamsService },
    { provide: AbstractAgencesService, useClass: AgencesService },
  ],
})
export class AppModule {}
