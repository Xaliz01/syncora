import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { CasesService } from "../cases.service";
import { AbstractCasesService } from "../ports/cases.service.port";

describe("CasesService", () => {
  let service: CasesService;
  let mockTemplateModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    deleteOne: jest.Mock;
  };
  let mockCaseModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findById: jest.Mock;
    deleteOne: jest.Mock;
    updateOne: jest.Mock;
    countDocuments: jest.Mock;
  };
  let mockInterventionModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    deleteOne: jest.Mock;
    deleteMany: jest.Mock;
  };

  const mockTemplateDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "tpl-123" },
    organizationId: "org-1",
    name: "Template 1",
    description: "Desc",
    steps: [],
    get: jest.fn((key: string) =>
      key === "createdAt" ? new Date("2025-01-01") : key === "updatedAt" ? new Date("2025-01-02") : undefined
    ),
    ...overrides
  });

  const mockCaseDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "case-123" },
    organizationId: "org-1",
    title: "Case 1",
    description: "Desc",
    status: "draft",
    priority: "medium",
    steps: [],
    interventionCount: 0,
    get: jest.fn((key: string) =>
      key === "createdAt" ? new Date("2025-01-01") : key === "updatedAt" ? new Date("2025-01-02") : undefined
    ),
    ...overrides
  });

  const mockInterventionDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "int-123" },
    organizationId: "org-1",
    caseId: "case-123",
    title: "Intervention 1",
    description: "Desc",
    status: "planned",
    get: jest.fn((key: string) =>
      key === "createdAt" ? new Date("2025-01-01") : key === "updatedAt" ? new Date("2025-01-02") : undefined
    ),
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    ...overrides
  });

  beforeEach(async () => {
    const execMock = jest.fn();
    const findChain = {
      sort: jest.fn().mockReturnValue({ exec: execMock }),
      select: jest.fn().mockReturnValue({ exec: execMock }),
      limit: jest.fn().mockReturnValue({ exec: execMock })
    };

    mockTemplateModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
      deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) })
    };

    mockCaseModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
      findById: jest.fn().mockReturnValue({ exec: execMock }),
      deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(0)
    };

    mockInterventionModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
      deleteMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 0 }) })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractCasesService, useClass: CasesService },
        { provide: getModelToken("CaseTemplate"), useValue: mockTemplateModel },
        { provide: getModelToken("Case"), useValue: mockCaseModel },
        { provide: getModelToken("Intervention"), useValue: mockInterventionModel }
      ]
    }).compile();

    service = module.get<AbstractCasesService>(AbstractCasesService) as CasesService;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createTemplate", () => {
    it("should create a template", async () => {
      const doc = mockTemplateDoc();
      mockTemplateModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        name: "Template 1",
        description: "Desc",
        steps: []
      };

      const result = await service.createTemplate(body);

      expect(mockTemplateModel.create).toHaveBeenCalled();
      expect(result.id).toBe("tpl-123");
      expect(result.name).toBe("Template 1");
    });

    it("should throw ConflictException on duplicate key error", async () => {
      const dupError = { code: 11000 };
      mockTemplateModel.create.mockRejectedValue(dupError);

      const body = {
        organizationId: "org-1",
        name: "Template 1",
        description: "Desc",
        steps: []
      };

      await expect(service.createTemplate(body)).rejects.toThrow(ConflictException);
    });
  });

  describe("listTemplates", () => {
    it("should return templates for organization", async () => {
      const docs = [mockTemplateDoc(), mockTemplateDoc({ _id: { toString: () => "tpl-456" } })];
      mockTemplateModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) })
      });

      const result = await service.listTemplates("org-1");

      expect(mockTemplateModel.find).toHaveBeenCalledWith({ organizationId: "org-1" });
      expect(result).toHaveLength(2);
    });
  });

  describe("getTemplate", () => {
    it("should return template when found", async () => {
      const doc = mockTemplateDoc();
      mockTemplateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.getTemplate("tpl-123", "org-1");

      expect(mockTemplateModel.findOne).toHaveBeenCalledWith({ _id: "tpl-123", organizationId: "org-1" });
      expect(result.id).toBe("tpl-123");
    });

    it("should throw NotFoundException when template not found", async () => {
      mockTemplateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.getTemplate("non-existent", "org-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteTemplate", () => {
    it("should delete template when found", async () => {
      mockTemplateModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 })
      });

      const result = await service.deleteTemplate("tpl-123", "org-1");

      expect(mockTemplateModel.deleteOne).toHaveBeenCalledWith({ _id: "tpl-123", organizationId: "org-1" });
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when template not found", async () => {
      mockTemplateModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 })
      });

      await expect(service.deleteTemplate("non-existent", "org-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("createCase", () => {
    it("should create case without template", async () => {
      const doc = mockCaseDoc();
      mockCaseModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        title: "Case 1",
        description: "Desc"
      };

      const result = await service.createCase(body);

      expect(mockCaseModel.create).toHaveBeenCalled();
      expect(result.id).toBe("case-123");
      expect(result.title).toBe("Case 1");
    });

    it("should create case with template and load steps", async () => {
      const template = mockTemplateDoc({
        steps: [{ name: "Step 1", description: "D", order: 0, todos: [{ label: "Todo 1", description: "D" }] }]
      });
      mockTemplateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(template)
      });
      const doc = mockCaseDoc({ steps: [{ id: "s1", name: "Step 1", order: 0, todos: [] }] });
      mockCaseModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        templateId: "tpl-123",
        title: "Case 1",
        description: "Desc"
      };

      const result = await service.createCase(body);

      expect(mockTemplateModel.findOne).toHaveBeenCalledWith({ _id: "tpl-123", organizationId: "org-1" });
      expect(mockCaseModel.create).toHaveBeenCalled();
      expect(result.id).toBe("case-123");
    });
  });

  describe("listCases", () => {
    it("should return cases with filters", async () => {
      const docs = [mockCaseDoc()];
      mockCaseModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) })
      });

      const result = await service.listCases("org-1", { status: "draft", assigneeId: "user-1" });

      expect(mockCaseModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          status: "draft",
          assigneeId: "user-1"
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("getCase", () => {
    it("should return case when found", async () => {
      const doc = mockCaseDoc();
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.getCase("case-123", "org-1");

      expect(mockCaseModel.findOne).toHaveBeenCalledWith({ _id: "case-123", organizationId: "org-1" });
      expect(result.id).toBe("case-123");
    });

    it("should throw NotFoundException when case not found", async () => {
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.getCase("non-existent", "org-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteCase", () => {
    it("should delete case and interventions", async () => {
      mockCaseModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 })
      });
      mockInterventionModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 2 })
      });

      const result = await service.deleteCase("case-123", "org-1");

      expect(mockCaseModel.deleteOne).toHaveBeenCalledWith({ _id: "case-123", organizationId: "org-1" });
      expect(mockInterventionModel.deleteMany).toHaveBeenCalledWith({ caseId: "case-123", organizationId: "org-1" });
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when case not found", async () => {
      mockCaseModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 })
      });

      await expect(service.deleteCase("non-existent", "org-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("createIntervention", () => {
    it("should create intervention and increment case count", async () => {
      const caseDoc = mockCaseDoc({ title: "Case 1" });
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(caseDoc)
      });
      const doc = mockInterventionDoc();
      mockInterventionModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        caseId: "case-123",
        title: "Intervention 1",
        description: "Desc"
      };

      const result = await service.createIntervention(body);

      expect(mockCaseModel.findOne).toHaveBeenCalledWith({ _id: "case-123", organizationId: "org-1" });
      expect(mockInterventionModel.create).toHaveBeenCalled();
      expect(mockCaseModel.updateOne).toHaveBeenCalledWith(
        { _id: "case-123" },
        { $inc: { interventionCount: 1 } }
      );
      expect(result.id).toBe("int-123");
    });

    it("should throw NotFoundException when case does not exist", async () => {
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const body = {
        organizationId: "org-1",
        caseId: "non-existent",
        title: "Intervention 1",
        description: "Desc"
      };

      await expect(service.createIntervention(body)).rejects.toThrow(NotFoundException);
      expect(mockInterventionModel.create).not.toHaveBeenCalled();
    });
  });

  describe("deleteIntervention", () => {
    it("should delete intervention and decrement case count", async () => {
      const doc = mockInterventionDoc({ caseId: "case-123" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.deleteIntervention("int-123", "org-1");

      expect(doc.deleteOne).toHaveBeenCalled();
      expect(mockCaseModel.updateOne).toHaveBeenCalledWith(
        { _id: "case-123" },
        { $inc: { interventionCount: -1 } }
      );
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when intervention not found", async () => {
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.deleteIntervention("non-existent", "org-1")).rejects.toThrow(NotFoundException);
    });
  });
});
