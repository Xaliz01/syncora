import { Module } from "@nestjs/common";
import { TrialTestDataController } from "../presentation/http/trial-test-data.controller";
import { AbstractTrialTestDataService } from "../domain/ports/trial-test-data.service.port";
import { TrialTestDataService } from "../domain/trial-test-data.service";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [SubscriptionsModule],
  controllers: [TrialTestDataController],
  providers: [{ provide: AbstractTrialTestDataService, useClass: TrialTestDataService }],
  exports: [AbstractTrialTestDataService],
})
export class TrialTestDataModule {}
