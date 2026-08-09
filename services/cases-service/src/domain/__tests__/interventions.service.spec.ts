import { NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { InterventionsService } from "../interventions.service";

describe("InterventionsService — type snapshot", () => {
  const interventionModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    updateOne: jest.fn(),
  };
  const caseModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };
  const commentModel = {};
  const interventionTypesService = {
    getById: jest.fn(),
  };

  let service: InterventionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InterventionsService(
      interventionModel as never,
      caseModel as never,
      commentModel as never,
      interventionTypesService as never,
    );
  });

  it("snapshots type name and color on create", async () => {
    const caseId = new Types.ObjectId().toString();
    const typeId = new Types.ObjectId().toString();
    caseModel.findOne.mockReturnValue({
      exec: async () => ({
        _id: caseId,
        title: "Dossier",
        organizationId: "org-1",
      }),
    });
    interventionTypesService.getById.mockResolvedValue({
      id: typeId,
      organizationId: "org-1",
      name: "SAV",
      color: "#ea580c",
    });
    const createdId = new Types.ObjectId();
    interventionModel.create.mockImplementation(async (payload: Record<string, unknown>) => ({
      _id: createdId,
      ...payload,
      status: "planned",
      billingStatus: "none",
      get: (key: string) => {
        if (key === "createdAt") return new Date("2026-01-01T00:00:00.000Z");
        if (key === "updatedAt") return new Date("2026-01-01T00:00:00.000Z");
        return undefined;
      },
    }));
    caseModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const res = await service.createIntervention({
      organizationId: "org-1",
      caseId,
      title: "Intervention",
      typeId,
    });

    expect(interventionTypesService.getById).toHaveBeenCalledWith(typeId, "org-1");
    expect(interventionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId,
        typeName: "SAV",
        typeColor: "#ea580c",
      }),
    );
    expect(res.typeName).toBe("SAV");
    expect(res.typeColor).toBe("#ea580c");
  });

  it("rejects unknown typeId", async () => {
    const caseId = new Types.ObjectId().toString();
    caseModel.findOne.mockReturnValue({
      exec: async () => ({ _id: caseId, title: "Dossier", organizationId: "org-1" }),
    });
    interventionTypesService.getById.mockRejectedValue(
      new NotFoundException("Type d’intervention introuvable"),
    );

    await expect(
      service.createIntervention({
        organizationId: "org-1",
        caseId,
        title: "Intervention",
        typeId: new Types.ObjectId().toString(),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(interventionModel.create).not.toHaveBeenCalled();
  });
});
