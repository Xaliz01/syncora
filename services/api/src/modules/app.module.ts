import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { provideHttpAccessLogInterceptor } from "@planwise/shared/nest";
import { AppController } from "../presentation/http/app.controller";
import { AbstractAppService } from "../domain/ports/app.service.port";
import { AppService } from "../services/app.service";
import { NotifyInterceptor } from "../infrastructure/notify.interceptor";
import { AppVersionInterceptor } from "../infrastructure/app-version.interceptor";
import { AnalyticsModule } from "./analytics.module";
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
import { BillingModule } from "./billing.module";
import { GatewayHttpModule } from "./gateway-http.module";
import { TrialTestDataModule } from "./trial-test-data.module";
import { DataImportModule } from "./data-import.module";
import { PlatformModule } from "./platform.module";
import { AssistantModule } from "./assistant.module";
import { DatabaseModule } from "./database.module";
import { PermissionsModule } from "./permissions.module";
import { TechniciansDomainModule } from "./technicians-domain.module";
import { CustomersDomainModule } from "./customers-domain.module";
import { UsersModule } from "./users.module";
import { FleetDomainModule } from "./fleet-domain.module";
import { DocumentsDomainModule } from "./documents-domain.module";
import { OrganizationsDomainModule } from "./organizations-domain.module";
import { StockDomainModule } from "./stock-domain.module";
import { BillingDomainModule } from "./billing-domain.module";
import { SubscriptionsDomainModule } from "./subscriptions-domain.module";
import { NotificationsDomainModule } from "./notifications-domain.module";
import { NotificationSchedulersModule } from "./notification-schedulers.module";
import { runsNotificationCrons } from "../process-role";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    GatewayHttpModule,
    AnalyticsModule,
    AuthModule,
    AccountModule,
    OrganizationsModule,
    AdminModule,
    PlatformModule,
    AssistantModule,
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
    BillingModule,
    PermissionsModule,
    UsersModule,
    TechniciansDomainModule,
    CustomersDomainModule,
    FleetDomainModule,
    DocumentsDomainModule,
    OrganizationsDomainModule,
    StockDomainModule,
    BillingDomainModule,
    SubscriptionsDomainModule,
    NotificationsDomainModule,
    ...(runsNotificationCrons() ? [NotificationSchedulersModule] : []),
    TrialTestDataModule,
    DataImportModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: AbstractAppService, useClass: AppService },
    { provide: APP_INTERCEPTOR, useClass: AppVersionInterceptor },
    { provide: APP_INTERCEPTOR, useClass: NotifyInterceptor },
    provideHttpAccessLogInterceptor(),
  ],
})
export class AppModule {}
