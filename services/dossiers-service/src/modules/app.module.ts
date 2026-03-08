import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DossiersController } from "../presentation/http/dossiers.controller";
import { DossiersService } from "../domain/dossiers.service";
import { DossierTemplateSchema } from "../persistence/dossier-template.schema";
import { DossierSchema } from "../persistence/dossier.schema";
import { InterventionSchema } from "../persistence/intervention.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-dossiers"
    ),
    MongooseModule.forFeature([
      { name: "DossierTemplate", schema: DossierTemplateSchema },
      { name: "Dossier", schema: DossierSchema },
      { name: "Intervention", schema: InterventionSchema }
    ])
  ],
  controllers: [DossiersController],
  providers: [DossiersService]
})
export class AppModule {}
