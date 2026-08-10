import { BadRequestException } from "@nestjs/common";
import type { AuthUser } from "@planwise/shared";
import { DataImportService } from "../data-import.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";
import { AssistantLlmClient } from "../../infrastructure/assistant/llm.client";

describe("DataImportService rollbackRun", () => {
  let scopedHttp: { request: jest.Mock };
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
    scopedHttp = { request: jest.fn() };
    service = new DataImportService(
      scopedHttp as unknown as OrganizationScopedHttpClient,
      {} as AssistantLlmClient,
    );
  });

  it("deletes created resources then marks run rolled_back", async () => {
    const runId = "run-1";
    const id1 = "507f1f77bcf86cd799439011";
    scopedHttp.request
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({ deleted: 1 })
      .mockResolvedValueOnce({});

    const result = await service.rollbackRun(user, runId);

    expect(result).toEqual({
      runId,
      entity: "customers",
      deleted: 1,
      status: "rolled_back",
    });
    expect(scopedHttp.request).toHaveBeenCalledTimes(3);
    expect(scopedHttp.request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        method: "post",
        path: "/import/delete-created",
        body: expect.objectContaining({
          entity: "customers",
          ids: [id1],
        }),
      }),
    );
    expect(scopedHttp.request.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        method: "patch",
        path: `/data-import-runs/${runId}/rolled-back`,
      }),
    );
  });

  it("rejects when already rolled_back", async () => {
    scopedHttp.request.mockResolvedValueOnce({
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
    expect(scopedHttp.request).toHaveBeenCalledTimes(1);
  });

  it("marks rolled_back with deleted 0 when no created ids", async () => {
    scopedHttp.request.mockResolvedValueOnce({
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
    scopedHttp.request.mockResolvedValueOnce({});

    const result = await service.rollbackRun(user, "run-2");
    expect(result).toEqual({
      runId: "run-2",
      entity: "articles",
      deleted: 0,
      status: "rolled_back",
    });
    expect(scopedHttp.request).toHaveBeenCalledTimes(2);
  });
});
