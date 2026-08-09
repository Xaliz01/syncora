import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  HealthController,
  provideHealthServiceName,
  provideHttpAccessLogInterceptor,
} from "@planwise/shared/nest";
import { UsersController } from "../presentation/http/users.controller";
import { EmailTemplatesController } from "../presentation/http/email-templates.controller";
import { UserSchema } from "../persistence/user.schema";
import { OrganizationMembershipSchema } from "../persistence/organization-membership.schema";
import { UserPreferencesSchema } from "../persistence/user-preferences.schema";
import { SupportImpersonationAuditSchema } from "../persistence/support-impersonation-audit.schema";
import { ProspectOutreachSchema } from "../persistence/prospect-outreach.schema";
import { UserSessionSchema } from "../persistence/user-session.schema";
import { EmailTemplateSchema } from "../persistence/email-template.schema";
import { AbstractUsersService } from "../domain/ports/users.service.port";
import { AbstractUserSessionsService } from "../domain/ports/user-sessions.service.port";
import { AbstractUserPreferencesService } from "../domain/ports/user-preferences.service.port";
import { AbstractProspectOutreachService } from "../domain/ports/prospect-outreach.service.port";
import { AbstractImpersonationAuditService } from "../domain/ports/impersonation-audit.service.port";
import { AbstractEmailTemplatesService } from "../domain/ports/email-templates.service.port";
import { UsersService } from "../domain/users.service";
import { UserSessionsService } from "../domain/user-sessions.service";
import { UserPreferencesService } from "../domain/user-preferences.service";
import { ProspectOutreachService } from "../domain/prospect-outreach.service";
import { ImpersonationAuditService } from "../domain/impersonation-audit.service";
import { EmailTemplatesService } from "../domain/email-templates.service";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-users"),
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "OrganizationMembership", schema: OrganizationMembershipSchema },
      { name: "UserPreferences", schema: UserPreferencesSchema },
      { name: "SupportImpersonationAudit", schema: SupportImpersonationAuditSchema },
      { name: "ProspectOutreach", schema: ProspectOutreachSchema },
      { name: "UserSession", schema: UserSessionSchema },
      { name: "EmailTemplate", schema: EmailTemplateSchema },
    ]),
  ],
  controllers: [UsersController, EmailTemplatesController, HealthController],
  providers: [
    provideHealthServiceName("planwise-users-service"),
    provideHttpAccessLogInterceptor(),
    { provide: AbstractUserSessionsService, useClass: UserSessionsService },
    { provide: AbstractUsersService, useClass: UsersService },
    { provide: AbstractUserPreferencesService, useClass: UserPreferencesService },
    { provide: AbstractProspectOutreachService, useClass: ProspectOutreachService },
    { provide: AbstractImpersonationAuditService, useClass: ImpersonationAuditService },
    { provide: AbstractEmailTemplatesService, useClass: EmailTemplatesService },
  ],
})
export class AppModule {}
