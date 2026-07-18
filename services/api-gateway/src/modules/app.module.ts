import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "../presentation/http/app.controller";
import { AbstractAppService } from "../domain/ports/app.service.port";
import { AppService } from "../services/app.service";
import { NotifyInterceptor } from "../infrastructure/notify.interceptor";
import { AppVersionInterceptor } from "../infrastructure/app-version.interceptor";
import { AuthModule } from "./auth.module";
import { AccountModule } from "./account.module";
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
import { NotificationsModule } from "./notifications.module";
import { DocumentsModule } from "./documents.module";
import { ExportsModule } from "./exports.module";
import { IntegrationsModule } from "./integrations.module";
import { GatewayHttpModule } from "./gateway-http.module";
import { TrialTestDataModule } from "./trial-test-data.module";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    GatewayHttpModule,
    AuthModule,
    AccountModule,
    OrganizationsModule,
    AdminModule,
    FleetModule,
    TechniciansModule,
    TeamsModule,
    AgencesModule,
    CasesModule,
    StockModule,
    SearchModule,
    SubscriptionsModule,
    NotificationsModule,
    DocumentsModule,
    ExportsModule,
    IntegrationsModule,
    TrialTestDataModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: AbstractAppService, useClass: AppService },
    { provide: APP_INTERCEPTOR, useClass: AppVersionInterceptor },
    { provide: APP_INTERCEPTOR, useClass: NotifyInterceptor },
  ],
})
export class AppModule {}
