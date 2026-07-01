import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HealthController, provideHealthServiceName } from "@planwise/shared/nest";
import { FleetController } from "../presentation/http/fleet.controller";
import { TestDataController } from "../presentation/http/test-data.controller";
import { VehicleSchema } from "../persistence/vehicle.schema";
import { AbstractFleetService } from "../domain/ports/fleet.service.port";
import { FleetService } from "../domain/fleet.service";


@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-fleet"),
    MongooseModule.forFeature([{ name: "Vehicle", schema: VehicleSchema }]),
  ],
  controllers: [FleetController, TestDataController, HealthController],
  providers: [
    provideHealthServiceName("planwise-fleet-service"),{ provide: AbstractFleetService, useClass: FleetService }],
})
export class AppModule {}
