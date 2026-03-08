import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PermissionsController } from "../presentation/http/permissions.controller";
import { PermissionsService } from "../domain/permissions.service";
import {
  PermissionProfileSchema
} from "../persistence/permission-profile.schema";
import {
  UserPermissionAssignmentSchema
} from "../persistence/user-permission-assignment.schema";
import { InvitationSchema } from "../persistence/invitation.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-permissions"
    ),
    MongooseModule.forFeature([
      { name: "PermissionProfile", schema: PermissionProfileSchema },
      { name: "UserPermissionAssignment", schema: UserPermissionAssignmentSchema },
      { name: "Invitation", schema: InvitationSchema }
    ])
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService]
})
export class AppModule {}
