import { httpControllers } from "../process-role";
import { Module } from "@nestjs/common";
import { SearchController } from "../presentation/http/search.controller";
import { AbstractSearchService } from "../domain/ports/search.service.port";
import { SearchGatewayService } from "../domain/search.service";
import { CasesModule } from "./cases.module";
import { CustomersDomainModule } from "./customers-domain.module";
import { FleetDomainModule } from "./fleet-domain.module";
import { TechniciansDomainModule } from "./technicians-domain.module";
import { StockDomainModule } from "./stock-domain.module";
import { BillingDomainModule } from "./billing-domain.module";
import { UsersModule } from "./users.module";

@Module({
  imports: [
    CasesModule,
    CustomersDomainModule,
    FleetDomainModule,
    TechniciansDomainModule,
    StockDomainModule,
    BillingDomainModule,
    UsersModule,
  ],
  controllers: httpControllers([SearchController]),
  providers: [{ provide: AbstractSearchService, useClass: SearchGatewayService }],
})
export class SearchModule {}
