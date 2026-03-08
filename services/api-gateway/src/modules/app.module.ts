import { Module } from "@nestjs/common";
import { AppController } from "../presentation/http/app.controller";
import { AppService } from "../services/app.service";
import { AuthModule } from "./auth.module";
import { AdminModule } from "./admin.module";
import { DossiersModule } from "./dossiers.module";

@Module({
  imports: [AuthModule, AdminModule, DossiersModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}

