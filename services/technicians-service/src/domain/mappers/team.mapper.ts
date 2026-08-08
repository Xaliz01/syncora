import type { TeamResponse, TeamStatus } from "@planwise/shared";
import type { TeamDocument } from "../../persistence/team.schema";

export function toTeamResponse(doc: TeamDocument, agenceName?: string): TeamResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    name: doc.name,
    agenceId: doc.agenceId,
    agenceName,
    technicianIds: doc.technicianIds,
    status: doc.status as TeamStatus,
    calendarColor: doc.calendarColor,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
