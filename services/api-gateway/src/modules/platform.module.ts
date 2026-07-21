import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PlatformController } from "../presentation/http/platform.controller";
import { AbstractPlatformService } from "../domain/ports/platform.service.port";
import { PlatformService } from "../domain/platform.service";
import { PlatformJwtAuthGuard } from "../infrastructure/platform-jwt-auth.guard";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [HttpModule.register({ timeout: 10000, maxRedirects: 0 }), SubscriptionsModule],
  controllers: [PlatformController],
  providers: [
    { provide: AbstractPlatformService, useClass: PlatformService },
    PlatformJwtAuthGuard,
  ],
})
export class PlatformModule {}
