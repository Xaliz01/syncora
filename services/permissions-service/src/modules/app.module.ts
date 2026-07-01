import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HealthController, provideHealthServiceName } from "@planwise/shared/nest";
import { PermissionsController } from "../presentation/http/permissions.controller";
import { TestDataController } from "../presentation/http/test-data.controller";
import { AbstractPermissionsService } from "../domain/ports/permissions.service.port";
import { PermissionsService } from "../domain/permissions.service";
import { PermissionProfileSchema } from "../persistence/permission-profile.schema";
import { UserPermissionAssignmentSchema } from "../persistence/user-permission-assignment.schema";
import { InvitationSchema } from "../persistence/invitation.schema";


@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-permissions",
    ),
    MongooseModule.forFeature([
      { name: "PermissionProfile", schema: PermissionProfileSchema },
      { name: "UserPermissionAssignment", schema: UserPermissionAssignmentSchema },
      { name: "Invitation", schema: InvitationSchema },
    ]),
  ],
  controllers: [PermissionsController, TestDataController, HealthController],
  providers: [
    provideHealthServiceName("planwise-permissions-service"),{ provide: AbstractPermissionsService, useClass: PermissionsService }],
})
export class AppModule {}
