import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UserSchema } from "../persistence/users/user.schema";
import { UserSessionSchema } from "../persistence/users/user-session.schema";
import { UserPreferencesSchema } from "../persistence/users/user-preferences.schema";
import { OrganizationMembershipSchema } from "../persistence/users/organization-membership.schema";
import { EmailTemplateSchema } from "../persistence/users/email-template.schema";
import { ProspectOutreachSchema } from "../persistence/users/prospect-outreach.schema";
import { SupportImpersonationAuditSchema } from "../persistence/users/support-impersonation-audit.schema";

import { AbstractUsersService } from "../domain/users/ports/users.service.port";
import { UsersService } from "../domain/users/users.service";
import { AbstractUserSessionsService } from "../domain/users/ports/user-sessions.service.port";
import { UserSessionsService } from "../domain/users/user-sessions.service";
import { AbstractUserPreferencesService } from "../domain/users/ports/user-preferences.service.port";
import { UserPreferencesService } from "../domain/users/user-preferences.service";
import { AbstractProspectOutreachService } from "../domain/users/ports/prospect-outreach.service.port";
import { ProspectOutreachService } from "../domain/users/prospect-outreach.service";
import { AbstractImpersonationAuditService } from "../domain/users/ports/impersonation-audit.service.port";
import { ImpersonationAuditService } from "../domain/users/impersonation-audit.service";
import { AbstractEmailTemplatesService } from "../domain/users/ports/email-templates.service.port";
import { EmailTemplatesService } from "../domain/users/email-templates.service";

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: "User", schema: UserSchema },
        { name: "UserSession", schema: UserSessionSchema },
        { name: "UserPreferences", schema: UserPreferencesSchema },
        { name: "OrganizationMembership", schema: OrganizationMembershipSchema },
        { name: "EmailTemplate", schema: EmailTemplateSchema },
        { name: "ProspectOutreach", schema: ProspectOutreachSchema },
        { name: "SupportImpersonationAudit", schema: SupportImpersonationAuditSchema },
      ],
      "users",
    ),
  ],
  providers: [
    { provide: AbstractUsersService, useClass: UsersService },
    { provide: AbstractUserSessionsService, useClass: UserSessionsService },
    { provide: AbstractUserPreferencesService, useClass: UserPreferencesService },
    { provide: AbstractProspectOutreachService, useClass: ProspectOutreachService },
    { provide: AbstractImpersonationAuditService, useClass: ImpersonationAuditService },
    { provide: AbstractEmailTemplatesService, useClass: EmailTemplatesService },
  ],
  exports: [
    AbstractUsersService,
    AbstractUserSessionsService,
    AbstractUserPreferencesService,
    AbstractProspectOutreachService,
    AbstractImpersonationAuditService,
    AbstractEmailTemplatesService,
  ],
})
export class UsersModule {}
