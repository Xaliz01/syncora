import { CasesDataImportService } from "../cases-data-import.service";

describe("CasesDataImportService — historique", () => {
  const caseModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  };
  const interventionModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const interventionTypeModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  let service: CasesDataImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CasesDataImportService(
      caseModel as never,
      interventionModel as never,
      interventionTypeModel as never,
    );
  });

  it("imports a completed intervention with timestamps", async () => {
    caseModel.findOne.mockReturnValue({
      exec: async () => ({ _id: "case-1", organizationId: "org-1" }),
    });
    interventionModel.findOne.mockReturnValue({ exec: async () => null });
    interventionTypeModel.findOne.mockReturnValue({ exec: async () => null });
    interventionTypeModel.create.mockResolvedValue({
      _id: { toString: () => "type-1" },
      name: "SAV",
      color: "#ea580c",
    });
    interventionModel.create.mockImplementation(async (payload: Record<string, unknown>) => ({
      _id: { toString: () => "int-1" },
      ...payload,
    }));
    caseModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const result = await service.importInterventions({
      organizationId: "org-1",
      caseIdByExternalId: { "DOS-1": "case-1" },
      rows: [
        {
          externalId: "INT-1",
          caseExternalId: "DOS-1",
          title: "Visite",
          status: "completed",
          startedAt: "2025-01-01T08:00:00.000Z",
          completedAt: "2025-01-01T10:00:00.000Z",
          typeName: "SAV",
          typeColor: "#ea580c",
        },
      ],
    });

    expect(result.created).toBe(1);
    expect(result.mappings[0]?.action).toBe("created");
    expect(result.errors.filter((e) => e.severity === "error")).toHaveLength(0);
    expect(interventionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        typeName: "SAV",
        importExternalId: "INT-1",
      }),
    );
  });

  it("rejects completed without completedAt", async () => {
    caseModel.findOne.mockReturnValue({
      exec: async () => ({ _id: "case-1", organizationId: "org-1" }),
    });

    const result = await service.importInterventions({
      organizationId: "org-1",
      caseIdByExternalId: { "DOS-1": "case-1" },
      rows: [
        {
          externalId: "INT-2",
          caseExternalId: "DOS-1",
          title: "Visite",
          status: "completed",
        },
      ],
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]?.field).toBe("completedAt");
  });

  it("hard-deletes created interventions", async () => {
    const deleteMany = jest.fn().mockReturnValue({
      exec: async () => ({ deletedCount: 1 }),
    });
    const svc = new CasesDataImportService(
      caseModel as never,
      { findOne: jest.fn(), create: jest.fn(), deleteMany } as never,
      interventionTypeModel as never,
    );
    const id = "507f1f77bcf86cd799439021";
    const result = await svc.deleteCreated({
      organizationId: "org-1",
      entity: "interventions",
      ids: [id],
    });
    expect(result.deleted).toBe(1);
    expect(deleteMany).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1" }));
  });
});
