import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersController } from "../presentation/http/users.controller";
import { UserSchema } from "../persistence/user.schema";
import { AbstractUsersService } from "../domain/ports/users.service.port";
import { UsersService } from "../domain/users.service";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-users"),
    MongooseModule.forFeature([{ name: "User", schema: UserSchema }])
  ],
  controllers: [UsersController],
  providers: [{ provide: AbstractUsersService, useClass: UsersService }]
})
export class AppModule {}
