import type { VehicleResponse, VehicleStatus, VehicleType } from "@planwise/shared";
import type { VehicleDocument } from "../../persistence/vehicle.schema";

export function toVehicleResponse(doc: VehicleDocument): VehicleResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    type: doc.type as VehicleType,
    registrationNumber: doc.registrationNumber,
    brand: doc.brand,
    model: doc.vehicleModel,
    year: doc.year,
    color: doc.color,
    vin: doc.vin,
    mileage: doc.mileage,
    status: doc.status as VehicleStatus,
    assignedTeamId: doc.assignedTeamId,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
