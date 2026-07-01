import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { HealthController, provideHealthServiceName } from "@planwise/shared/nest";
import { ExportsController } from "../presentation/http/exports.controller";
import { AbstractExportsService } from "../domain/ports/exports.service.port";
import { ExportsService } from "../domain/exports.service";

@Module({
  imports: [HttpModule.register({ timeout: 30000, maxRedirects: 0 })],
  controllers: [ExportsController, HealthController],
  providers: [
    provideHealthServiceName("planwise-exports-service"),
    { provide: AbstractExportsService, useClass: ExportsService },
  ],
})
export class AppModule {}
