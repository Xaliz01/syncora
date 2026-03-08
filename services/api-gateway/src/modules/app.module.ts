import { Module } from "@nestjs/common";
import { AppController } from "../presentation/http/app.controller";
import { AppService } from "../services/app.service";
import { AuthModule } from "./auth.module";
import { AdminModule } from "./admin.module";

@Module({
  imports: [AuthModule, AdminModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}

