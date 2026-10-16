import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AbstractPermissionsService } from "../domain/permissions/ports/permissions.service.port";
import { PermissionsService } from "../domain/permissions/permissions.service";
import { PermissionProfileSchema } from "../persistence/permissions/permission-profile.schema";
import { UserPermissionAssignmentSchema } from "../persistence/permissions/user-permission-assignment.schema";
import { InvitationSchema } from "../persistence/permissions/invitation.schema";

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: "PermissionProfile", schema: PermissionProfileSchema },
        { name: "UserPermissionAssignment", schema: UserPermissionAssignmentSchema },
        { name: "Invitation", schema: InvitationSchema },
      ],
      "permissions",
    ),
  ],
  providers: [{ provide: AbstractPermissionsService, useClass: PermissionsService }],
  exports: [AbstractPermissionsService],
})
export class PermissionsModule {}
