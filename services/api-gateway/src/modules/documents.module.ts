import { Module } from "@nestjs/common";
import { DocumentsController } from "../presentation/http/documents.controller";
import { AbstractDocumentsGatewayService } from "../domain/ports/documents.service.port";
import { DocumentsGatewayService } from "../domain/documents.service";
import { SubscriptionsModule } from "./subscriptions.module";
import { DocumentsDomainModule } from "./documents-domain.module";
import { CasesModule } from "./cases.module";
import { CustomersDomainModule } from "./customers-domain.module";
import { FleetDomainModule } from "./fleet-domain.module";
import { TechniciansDomainModule } from "./technicians-domain.module";
import { OrganizationsDomainModule } from "./organizations-domain.module";

@Module({
  imports: [
    SubscriptionsModule,
    DocumentsDomainModule,
    CasesModule,
    CustomersDomainModule,
    FleetDomainModule,
    TechniciansDomainModule,
    OrganizationsDomainModule,
  ],
  controllers: [DocumentsController],
  providers: [{ provide: AbstractDocumentsGatewayService, useClass: DocumentsGatewayService }],
})
export class DocumentsModule {}
