import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { CasesController } from "../presentation/http/cases.controller";
import { MaintenanceContractsController } from "../presentation/http/maintenance-contracts.controller";
import { AbstractCasesGatewayService } from "../domain/ports/cases.service.port";
import { CasesGatewayService } from "../domain/cases.service";
import { AbstractMaintenanceContractsGatewayService } from "../domain/ports/maintenance-contracts.service.port";
import { MaintenanceContractsGatewayService } from "../domain/maintenance-contracts.gateway.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { CustomersModule } from "./customers.module";
import { OrderGiversModule } from "./order-givers.module";
import { SubscriptionsModule } from "./subscriptions.module";
import { TechniciansDomainModule } from "./technicians-domain.module";
import { OrganizationsDomainModule } from "./organizations-domain.module";
import { DocumentsDomainModule } from "./documents-domain.module";
import { NotificationsDomainModule } from "./notifications-domain.module";
import { UsersModule } from "./users.module";
import { PermissionsModule } from "./permissions.module";

import { AbstractCasesService } from "../domain/cases/ports/cases.service.port";
import { AbstractInterventionsService } from "../domain/cases/ports/interventions.service.port";
import { AbstractQuotesService } from "../domain/cases/ports/quotes.service.port";
import { AbstractCommentsService } from "../domain/cases/ports/comments.service.port";
import { AbstractCaseHistoryService } from "../domain/cases/ports/case-history.service.port";
import { AbstractDashboardService } from "../domain/cases/ports/dashboard.service.port";
import { AbstractCaseTemplatesService } from "../domain/cases/ports/case-templates.service.port";
import { AbstractInterventionTypesService } from "../domain/cases/ports/intervention-types.service.port";
import { AbstractCasesDataImportService } from "../domain/cases/ports/cases-data-import.service.port";

import { CasesService } from "../domain/cases/cases.service";
import { InterventionsService } from "../domain/cases/interventions.service";
import { QuotesService } from "../domain/cases/quotes.service";
import { CommentsService } from "../domain/cases/comments.service";
import { CaseHistoryService } from "../domain/cases/case-history.service";
import { DashboardService } from "../domain/cases/dashboard.service";
import { CaseTemplatesService } from "../domain/cases/case-templates.service";
import { InterventionTypesService } from "../domain/cases/intervention-types.service";
import { CasesDataImportService } from "../domain/cases/cases-data-import.service";
import { MaintenanceContractsService } from "../domain/cases/maintenance-contracts.service";
import { MaintenanceContractVisitsScheduler } from "../domain/cases/maintenance-contract-visits.scheduler";
import { httpControllers, whenWorkerCrons } from "../process-role";
import { CronRunRecorder } from "../domain/cases/cron-run.recorder";

import { CaseTemplateSchema } from "../persistence/cases/case-template.schema";
import { CaseSchema } from "../persistence/cases/case.schema";
import { CaseHistorySchema } from "../persistence/cases/case-history.schema";
import { InterventionSchema } from "../persistence/cases/intervention.schema";
import { InterventionTypeSchema } from "../persistence/cases/intervention-type.schema";
import { QuoteSchema } from "../persistence/cases/quote.schema";
import { CommentSchema } from "../persistence/cases/comment.schema";
import { MaintenanceContractSchema } from "../persistence/cases/maintenance-contract.schema";
import { CronRunSchema } from "../persistence/cases/cron-run.schema";

@Module({
  imports: [
    HttpModule.register({ timeout: 5000, maxRedirects: 0 }),
    MongooseModule.forFeature(
      [
        { name: "CaseTemplate", schema: CaseTemplateSchema },
        { name: "Case", schema: CaseSchema },
        { name: "CaseHistory", schema: CaseHistorySchema },
        { name: "Intervention", schema: InterventionSchema },
        { name: "InterventionType", schema: InterventionTypeSchema },
        { name: "Quote", schema: QuoteSchema },
        { name: "Comment", schema: CommentSchema },
        { name: "MaintenanceContract", schema: MaintenanceContractSchema },
        { name: "CronRun", schema: CronRunSchema },
      ],
      "cases",
    ),
    CustomersModule,
    OrderGiversModule,
    SubscriptionsModule,
    TechniciansDomainModule,
    OrganizationsDomainModule,
    DocumentsDomainModule,
    NotificationsDomainModule,
    UsersModule,
    PermissionsModule,
  ],
  controllers: httpControllers([CasesController, MaintenanceContractsController]),
  providers: [
    { provide: AbstractCasesGatewayService, useClass: CasesGatewayService },
    {
      provide: AbstractMaintenanceContractsGatewayService,
      useClass: MaintenanceContractsGatewayService,
    },
    { provide: AbstractCasesService, useClass: CasesService },
    { provide: AbstractInterventionsService, useClass: InterventionsService },
    { provide: AbstractQuotesService, useClass: QuotesService },
    { provide: AbstractCommentsService, useClass: CommentsService },
    { provide: AbstractCaseHistoryService, useClass: CaseHistoryService },
    { provide: AbstractDashboardService, useClass: DashboardService },
    { provide: AbstractCaseTemplatesService, useClass: CaseTemplatesService },
    { provide: AbstractInterventionTypesService, useClass: InterventionTypesService },
    { provide: AbstractCasesDataImportService, useClass: CasesDataImportService },
    MaintenanceContractsService,
    ...whenWorkerCrons([MaintenanceContractVisitsScheduler]),
    CronRunRecorder,
    RequirePermissionGuard,
  ],
  exports: [
    AbstractCasesGatewayService,
    AbstractMaintenanceContractsGatewayService,
    AbstractCasesService,
    AbstractInterventionsService,
    AbstractQuotesService,
    AbstractCommentsService,
    AbstractCaseHistoryService,
    AbstractDashboardService,
    AbstractCaseTemplatesService,
    AbstractInterventionTypesService,
    AbstractCasesDataImportService,
    MaintenanceContractsService,
    CronRunRecorder,
  ],
})
export class CasesModule {}
