import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CasesController } from "../presentation/http/cases.controller";
import { AbstractCasesService } from "../domain/ports/cases.service.port";
import { CasesService } from "../domain/cases.service";
import { CaseTemplateSchema } from "../persistence/case-template.schema";
import { CaseSchema } from "../persistence/case.schema";
import { InterventionSchema } from "../persistence/intervention.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-cases"
    ),
    MongooseModule.forFeature([
      { name: "CaseTemplate", schema: CaseTemplateSchema },
      { name: "Case", schema: CaseSchema },
      { name: "Intervention", schema: InterventionSchema }
    ])
  ],
  controllers: [CasesController],
  providers: [{ provide: AbstractCasesService, useClass: CasesService }]
})
export class AppModule {}
