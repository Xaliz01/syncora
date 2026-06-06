import { Module } from "@nestjs/common";
import { TrialTestDataController } from "../presentation/http/trial-test-data.controller";
import { AbstractTrialTestDataService } from "../domain/ports/trial-test-data.service.port";
import { TrialTestDataService } from "../domain/trial-test-data.service";
import { AdminRoleGuard } from "../infrastructure/admin-role.guard";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [SubscriptionsModule],
  controllers: [TrialTestDataController],
  providers: [
    { provide: AbstractTrialTestDataService, useClass: TrialTestDataService },
    AdminRoleGuard,
  ],
  exports: [AbstractTrialTestDataService],
})
export class TrialTestDataModule {}
