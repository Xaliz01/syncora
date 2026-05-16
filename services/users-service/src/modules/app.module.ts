import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersController } from "../presentation/http/users.controller";
import { UserSchema } from "../persistence/user.schema";
import { OrganizationMembershipSchema } from "../persistence/organization-membership.schema";
import { UserPreferencesSchema } from "../persistence/user-preferences.schema";
import { AbstractUsersService } from "../domain/ports/users.service.port";
import { UsersService } from "../domain/users.service";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-users"),
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "OrganizationMembership", schema: OrganizationMembershipSchema },
      { name: "UserPreferences", schema: UserPreferencesSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [{ provide: AbstractUsersService, useClass: UsersService }],
})
export class AppModule {}
