import type {
  CaseDashboardResponse,
  DashboardStatFilter,
  DashboardTodoCaseItem,
} from "@planwise/shared";

export abstract class AbstractDashboardService {
  abstract getDashboard(
    organizationId: string,
    userId: string,
    userProfileId?: string,
  ): Promise<CaseDashboardResponse>;
  abstract getDashboardTodoCases(
    organizationId: string,
    userId: string,
    userProfileId: string | undefined,
    templateId: string,
    todoLabel: string,
  ): Promise<DashboardTodoCaseItem[]>;
  abstract getDashboardStatCases(
    organizationId: string,
    userId: string,
    userProfileId: string | undefined,
    filter: DashboardStatFilter,
  ): Promise<DashboardTodoCaseItem[]>;
}
