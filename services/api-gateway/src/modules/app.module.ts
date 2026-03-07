import { Module } from "@nestjs/common";
import { AppController } from "../presentation/http/app.controller";
import { AppService } from "../services/app.service";
import { AuthModule } from "./auth.module";

@Module({
  imports: [AuthModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}

