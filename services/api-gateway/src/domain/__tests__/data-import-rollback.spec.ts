import { BadRequestException } from "@nestjs/common";
import type { AuthUser } from "@planwise/shared";
import { DataImportService } from "../data-import.service";
import { AssistantLlmClient } from "../../infrastructure/assistant/llm.client";
import { AbstractCustomersDataImportService } from "../customers/ports/customers-data-import.service.port";
import { AbstractStockDataImportService } from "../stock/ports/stock-data-import.service.port";
import { AbstractCasesDataImportService } from "../cases/ports/cases-data-import.service.port";
import { AbstractDataImportRunsService } from "../organizations/ports/data-import-runs.service.port";
import { AbstractUsersService } from "../users/ports/users.service.port";
import { AbstractTeamsService } from "../technicians/ports/teams.service.port";

describe("DataImportService rollbackRun", () => {
  let customersImport: { deleteCreated: jest.Mock };
  let stockImport: { deleteCreated: jest.Mock };
  let importRuns: { findByIdWithIds: jest.Mock; markRolledBack: jest.Mock };
  let service: DataImportService;

  const user: AuthUser = {
    id: "user-1",
    email: "admin@example.com",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin",
  };

  beforeEach(() => {
    customersImport = { deleteCreated: jest.fn() };
    stockImport = { deleteCreated: jest.fn() };
    importRuns = { findByIdWithIds: jest.fn(), markRolledBack: jest.fn() };
    service = new DataImportService(
      {} as AssistantLlmClient,
      customersImport as unknown as AbstractCustomersDataImportService,
      stockImport as unknown as AbstractStockDataImportService,
      {} as AbstractCasesDataImportService,
      importRuns as unknown as AbstractDataImportRunsService,
      {} as AbstractUsersService,
      {} as AbstractTeamsService,
    );
  });

  it("deletes created resources then marks run rolled_back", async () => {
    const runId = "run-1";
    const id1 = "507f1f77bcf86cd799439011";
    importRuns.findByIdWithIds.mockResolvedValue({
      id: runId,
      organizationId: "org-1",
      entity: "customers",
      status: "completed",
      createdResourceIds: [id1],
      createdCount: 1,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      createdAt: "2026-08-10T10:00:00.000Z",
      createdByUserId: "user-1",
    });
    customersImport.deleteCreated.mockResolvedValue({ deleted: 1 });
    importRuns.markRolledBack.mockResolvedValue({});

    const result = await service.rollbackRun(user, runId);

    expect(result).toEqual({
      runId,
      entity: "customers",
      deleted: 1,
      status: "rolled_back",
    });
    expect(customersImport.deleteCreated).toHaveBeenCalledWith({
      organizationId: "org-1",
      entity: "customers",
      ids: [id1],
    });
    expect(importRuns.markRolledBack).toHaveBeenCalledWith("org-1", runId);
  });

  it("rejects when already rolled_back", async () => {
    importRuns.findByIdWithIds.mockResolvedValue({
      id: "run-1",
      organizationId: "org-1",
      entity: "customers",
      status: "rolled_back",
      createdResourceIds: [],
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      createdAt: "2026-08-10T10:00:00.000Z",
      createdByUserId: "user-1",
    });

    await expect(service.rollbackRun(user, "run-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(customersImport.deleteCreated).not.toHaveBeenCalled();
    expect(importRuns.markRolledBack).not.toHaveBeenCalled();
  });

  it("marks rolled_back with deleted 0 when no created ids", async () => {
    importRuns.findByIdWithIds.mockResolvedValue({
      id: "run-2",
      organizationId: "org-1",
      entity: "articles",
      status: "completed",
      createdResourceIds: [],
      createdCount: 0,
      updatedCount: 5,
      skippedCount: 0,
      errorCount: 0,
      createdAt: "2026-08-10T10:00:00.000Z",
      createdByUserId: "user-1",
    });
    importRuns.markRolledBack.mockResolvedValue({});

    const result = await service.rollbackRun(user, "run-2");
    expect(result).toEqual({
      runId: "run-2",
      entity: "articles",
      deleted: 0,
      status: "rolled_back",
    });
    expect(stockImport.deleteCreated).not.toHaveBeenCalled();
    expect(importRuns.markRolledBack).toHaveBeenCalledWith("org-1", "run-2");
  });
});
