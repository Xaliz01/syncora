import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HealthController, provideHealthServiceName } from "@planwise/shared/nest";
import { TechniciansController } from "../presentation/http/technicians.controller";
import { TeamsController } from "../presentation/http/teams.controller";
import { AgencesController } from "../presentation/http/agences.controller";
import { AbstractTechniciansService } from "../domain/ports/technicians.service.port";
import { AbstractTeamsService } from "../domain/ports/teams.service.port";
import { AbstractAgencesService } from "../domain/ports/agences.service.port";
import { TechniciansService } from "../domain/technicians.service";
import { TeamsService } from "../domain/teams.service";
import { AgencesService } from "../domain/agences.service";
import { TestDataPurgeService } from "../domain/test-data-purge.service";
import { TestDataController } from "../presentation/http/test-data.controller";
import { TechnicianSchema } from "../persistence/technician.schema";
import { TeamSchema } from "../persistence/team.schema";
import { AgenceSchema } from "../persistence/agence.schema";


@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-technicians",
    ),
    MongooseModule.forFeature([
      { name: "Technician", schema: TechnicianSchema },
      { name: "Team", schema: TeamSchema },
      { name: "Agence", schema: AgenceSchema },
    ]),
  ],
  controllers: [TechniciansController, TeamsController, AgencesController, TestDataController, HealthController],
  providers: [
    provideHealthServiceName("planwise-technicians-service"),
    { provide: AbstractTechniciansService, useClass: TechniciansService },
    { provide: AbstractTeamsService, useClass: TeamsService },
    { provide: AbstractAgencesService, useClass: AgencesService },
    TestDataPurgeService,
  ],
})
export class AppModule {}
