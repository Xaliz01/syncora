import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { VehicleSchema } from "../persistence/fleet/vehicle.schema";
import { AbstractFleetService } from "../domain/fleet/ports/fleet.service.port";
import { FleetService } from "../domain/fleet/fleet.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: "Vehicle", schema: VehicleSchema }], "fleet")],
  providers: [{ provide: AbstractFleetService, useClass: FleetService }],
  exports: [AbstractFleetService],
})
export class FleetDomainModule {}
