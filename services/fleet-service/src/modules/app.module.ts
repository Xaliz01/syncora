import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FleetController } from "../presentation/http/fleet.controller";
import { VehicleSchema } from "../persistence/vehicle.schema";
import { AbstractFleetService } from "../domain/ports/fleet.service.port";
import { FleetService } from "../domain/fleet.service";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-fleet"
    ),
    MongooseModule.forFeature([
      { name: "Vehicle", schema: VehicleSchema }
    ])
  ],
  controllers: [FleetController],
  providers: [{ provide: AbstractFleetService, useClass: FleetService }]
})
export class AppModule {}
