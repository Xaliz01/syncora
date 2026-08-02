import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import {
  HealthController,
  provideHealthServiceName,
  provideHttpAccessLogInterceptor,
} from "@planwise/shared/nest";
import { CasesController } from "../presentation/http/cases.controller";
import { TestDataController } from "../presentation/http/test-data.controller";
import {
  CasesPlatformOpsController,
  MaintenanceContractsController,
} from "../presentation/http/maintenance-contracts.controller";
import { AbstractCasesService } from "../domain/ports/cases.service.port";
import { CasesService } from "../domain/cases.service";
import { MaintenanceContractsService } from "../domain/maintenance-contracts.service";
import { MaintenanceContractVisitsScheduler } from "../domain/maintenance-contract-visits.scheduler";
import { CronRunRecorder } from "../domain/cron-run.recorder";
import { CaseTemplateSchema } from "../persistence/case-template.schema";
import { CaseSchema } from "../persistence/case.schema";
import { CaseHistorySchema } from "../persistence/case-history.schema";
import { InterventionSchema } from "../persistence/intervention.schema";
import { QuoteSchema } from "../persistence/quote.schema";
import { CommentSchema } from "../persistence/comment.schema";
import { MaintenanceContractSchema } from "../persistence/maintenance-contract.schema";
import { CronRunSchema } from "../persistence/cron-run.schema";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-cases"),
    MongooseModule.forFeature([
      { name: "CaseTemplate", schema: CaseTemplateSchema },
      { name: "Case", schema: CaseSchema },
      { name: "CaseHistory", schema: CaseHistorySchema },
      { name: "Intervention", schema: InterventionSchema },
      { name: "Quote", schema: QuoteSchema },
      { name: "Comment", schema: CommentSchema },
      { name: "MaintenanceContract", schema: MaintenanceContractSchema },
      { name: "CronRun", schema: CronRunSchema },
    ]),
  ],
  controllers: [
    CasesController,
    MaintenanceContractsController,
    CasesPlatformOpsController,
    TestDataController,
    HealthController,
  ],
  providers: [
    provideHealthServiceName("planwise-cases-service"),
    provideHttpAccessLogInterceptor(),
    { provide: AbstractCasesService, useClass: CasesService },
    MaintenanceContractsService,
    MaintenanceContractVisitsScheduler,
    CronRunRecorder,
  ],
})
export class AppModule {}
