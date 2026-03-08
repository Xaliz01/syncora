import { Module } from "@nestjs/common";
import { AppController } from "../presentation/http/app.controller";
import { AbstractAppService } from "../domain/ports/app.service.port";
import { AppService } from "../services/app.service";
import { AuthModule } from "./auth.module";
import { AdminModule } from "./admin.module";
import { FleetModule } from "./fleet.module";
import { CasesModule } from "./cases.module";
import { StockModule } from "./stock.module";

@Module({
  imports: [AuthModule, AdminModule, FleetModule, CasesModule, StockModule],
  controllers: [AppController],
  providers: [{ provide: AbstractAppService, useClass: AppService }]
})
export class AppModule {}
