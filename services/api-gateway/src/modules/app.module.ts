import { Module } from "@nestjs/common";
import { AppController } from "../presentation/http/app.controller";
import { AppService } from "../services/app.service";
import { AuthModule } from "./auth.module";
import { AdminModule } from "./admin.module";
import { CasesModule } from "./cases.module";

@Module({
  imports: [AuthModule, AdminModule, CasesModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}

