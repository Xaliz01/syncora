import { DataImportRunsService } from "../data-import-runs.service";

describe("DataImportRunsService", () => {
  const runModel = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  let service: DataImportRunsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DataImportRunsService(runModel as never);
  });

  it("creates a completed run with createdResourceIds", async () => {
    const createdAt = new Date("2026-08-10T10:00:00.000Z");
    runModel.create.mockResolvedValue({
      _id: { toString: () => "run-1" },
      organizationId: "org-1",
      entity: "customers",
      fileName: "clients.csv",
      createdByUserId: "user-1",
      createdAt,
      status: "completed",
      stats: { created: 2, updated: 1, skipped: 0, errorCount: 0 },
      createdResourceIds: ["a", "b"],
    });

    const summary = await service.create({
      organizationId: "org-1",
      entity: "customers",
      fileName: "clients.csv",
      createdByUserId: "user-1",
      stats: { created: 2, updated: 1, skipped: 0, errorCount: 0 },
      createdResourceIds: ["a", "b"],
    });

    expect(summary.id).toBe("run-1");
    expect(summary.status).toBe("completed");
    expect(summary.createdCount).toBe(2);
  });

  it("marks run as rolled_back", async () => {
    const createdAt = new Date("2026-08-10T10:00:00.000Z");
    runModel.findOneAndUpdate.mockReturnValue({
      exec: async () => ({
        _id: { toString: () => "507f1f77bcf86cd799439011" },
        organizationId: "org-1",
        entity: "customers",
        createdByUserId: "user-1",
        createdAt,
        status: "rolled_back",
        rolledBackAt: new Date("2026-08-10T11:00:00.000Z"),
        stats: { created: 2, updated: 0, skipped: 0, errorCount: 0 },
        createdResourceIds: [],
      }),
    });

    const summary = await service.markRolledBack("org-1", "507f1f77bcf86cd799439011");
    expect(summary.status).toBe("rolled_back");
    expect(summary.createdCount).toBe(0);
  });
});
