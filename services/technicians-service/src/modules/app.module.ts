import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TechniciansController } from "../presentation/http/technicians.controller";
import { AbstractTechniciansService } from "../domain/ports/technicians.service.port";
import { TechniciansService } from "../domain/technicians.service";
import { TechnicianSchema } from "../persistence/technician.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-technicians"
    ),
    MongooseModule.forFeature([
      { name: "Technician", schema: TechnicianSchema }
    ])
  ],
  controllers: [TechniciansController],
  providers: [{ provide: AbstractTechniciansService, useClass: TechniciansService }]
})
export class AppModule {}
