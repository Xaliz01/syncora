import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "../presentation/http/app.controller";
import { AbstractAppService } from "../domain/ports/app.service.port";
import { AppService } from "../services/app.service";
import { NotifyInterceptor } from "../infrastructure/notify.interceptor";
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
import { NotificationsModule } from "./notifications.module";
import { DocumentsModule } from "./documents.module";
import { GatewayHttpModule } from "./gateway-http.module";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    GatewayHttpModule,
    AuthModule,
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
  ],
  controllers: [AppController],
  providers: [
    { provide: AbstractAppService, useClass: AppService },
    { provide: APP_INTERCEPTOR, useClass: NotifyInterceptor },
  ],
})
export class AppModule {}
