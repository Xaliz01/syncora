import type { CaseHistoryEntryResponse, CreateCaseHistoryBody } from "@planwise/shared";

export abstract class AbstractCaseHistoryService {
  abstract addCaseHistory(body: CreateCaseHistoryBody): Promise<CaseHistoryEntryResponse>;
  abstract listCaseHistory(
    caseId: string,
    organizationId: string,
  ): Promise<CaseHistoryEntryResponse[]>;
}
