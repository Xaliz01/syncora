import type { TechnicianResponse, TechnicianStatus } from "@planwise/shared";
import type { TechnicianDocument } from "../../persistence/technician.schema";

export function toTechnicianResponse(doc: TechnicianDocument): TechnicianResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    phone: doc.phone,
    speciality: doc.speciality,
    status: doc.status as TechnicianStatus,
    userId: doc.userId,
    calendarColor: doc.calendarColor,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
