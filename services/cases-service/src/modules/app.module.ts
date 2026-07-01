import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HealthController, provideHealthServiceName } from "@planwise/shared/nest";
import { CasesController } from "../presentation/http/cases.controller";
import { TestDataController } from "../presentation/http/test-data.controller";
import { AbstractCasesService } from "../domain/ports/cases.service.port";
import { CasesService } from "../domain/cases.service";
import { CaseTemplateSchema } from "../persistence/case-template.schema";
import { CaseSchema } from "../persistence/case.schema";
import { CaseHistorySchema } from "../persistence/case-history.schema";
import { InterventionSchema } from "../persistence/intervention.schema";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-cases"),
    MongooseModule.forFeature([
      { name: "CaseTemplate", schema: CaseTemplateSchema },
      { name: "Case", schema: CaseSchema },
      { name: "CaseHistory", schema: CaseHistorySchema },
      { name: "Intervention", schema: InterventionSchema },
    ]),
  ],
  controllers: [CasesController, TestDataController, HealthController],
  providers: [
    provideHealthServiceName("planwise-cases-service"),
    { provide: AbstractCasesService, useClass: CasesService },
  ],
})
export class AppModule {}
