import { Module } from "@nestjs/common";
import { AppController } from "../presentation/http/app.controller";
import { AbstractAppService } from "../domain/ports/app.service.port";
import { AppService } from "../services/app.service";
import { AuthModule } from "./auth.module";
import { AdminModule } from "./admin.module";
import { FleetModule } from "./fleet.module";
import { TechniciansModule } from "./technicians.module";
import { TeamsModule } from "./teams.module";
import { AgencesModule } from "./agences.module";
import { CasesModule } from "./cases.module";
import { StockModule } from "./stock.module";
import { SearchModule } from "./search.module";
import { SubscriptionsModule } from "./subscriptions.module";
import { OrganizationsModule } from "./organizations.module";

@Module({
  imports: [
    AuthModule,
    OrganizationsModule,
    AdminModule,
    FleetModule,
    TechniciansModule, TeamsModule, AgencesModule,
    CasesModule,
    StockModule, SearchModule,
    SubscriptionsModule
  ],
  controllers: [AppController],
  providers: [{ provide: AbstractAppService, useClass: AppService }]
})
export class AppModule {}
