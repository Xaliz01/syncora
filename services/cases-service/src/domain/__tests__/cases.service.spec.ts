import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { activeDocumentFilter } from "@planwise/shared";
import { CasesService } from "../cases.service";
import { AbstractCasesService } from "../ports/cases.service.port";

const updateChain = (result: Record<string, unknown> = { matchedCount: 1, modifiedCount: 1 }) => {
  const p = Promise.resolve(result);
  return {
    exec: jest.fn().mockImplementation(() => p),
    then: (fn?: (v: unknown) => unknown) => p.then(fn),
  };
};

describe("CasesService", () => {
  let service: CasesService;
  let mockTemplateModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    updateOne: jest.Mock;
  };
  let mockCaseModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findById: jest.Mock;
    updateOne: jest.Mock;
    countDocuments: jest.Mock;
  };
  let mockInterventionModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    updateOne: jest.Mock;
    updateMany: jest.Mock;
    countDocuments: jest.Mock;
  };
  let mockCaseHistoryModel: {
    create: jest.Mock;
    find: jest.Mock;
  };

  const mockTemplateDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "tpl-123" },
    organizationId: "org-1",
    name: "Template 1",
    description: "Desc",
    steps: [],
    get: jest.fn((key: string) =>
      key === "createdAt"
        ? new Date("2025-01-01")
        : key === "updatedAt"
          ? new Date("2025-01-02")
          : undefined,
    ),
    ...overrides,
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
      key === "createdAt"
        ? new Date("2025-01-01")
        : key === "updatedAt"
          ? new Date("2025-01-02")
          : undefined,
    ),
    ...overrides,
  });

  const mockInterventionDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "int-123" },
    organizationId: "org-1",
    caseId: "case-123",
    title: "Intervention 1",
    description: "Desc",
    status: "planned",
    get: jest.fn((key: string) =>
      key === "createdAt"
        ? new Date("2025-01-01")
        : key === "updatedAt"
          ? new Date("2025-01-02")
          : undefined,
    ),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(async () => {
    const execMock = jest.fn();
    const findChain = {
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: execMock }),
        }),
        limit: jest.fn().mockReturnValue({ exec: execMock }),
        exec: execMock,
      }),
      select: jest.fn().mockReturnValue({ exec: execMock }),
      limit: jest.fn().mockReturnValue({ exec: execMock }),
      skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ exec: execMock }),
      }),
    };

    mockTemplateModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
      updateOne: jest.fn().mockImplementation(() => updateChain()),
    };

    mockCaseModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
      findById: jest.fn().mockReturnValue({ exec: execMock }),
      updateOne: jest.fn().mockImplementation(() => updateChain()),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    };

    mockInterventionModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      updateOne: jest.fn().mockImplementation(() => updateChain()),
      updateMany: jest.fn().mockImplementation(() => updateChain({ modifiedCount: 2 })),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    };

    mockCaseHistoryModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        }),
      }),
    };

    const mockQuoteModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      updateOne: jest.fn().mockImplementation(() => updateChain()),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    const mockCommentModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        }),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      updateOne: jest.fn().mockImplementation(() => updateChain()),
      updateMany: jest.fn().mockImplementation(() => updateChain()),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractCasesService, useClass: CasesService },
        { provide: getModelToken("CaseTemplate"), useValue: mockTemplateModel },
        { provide: getModelToken("Case"), useValue: mockCaseModel },
        { provide: getModelToken("CaseHistory"), useValue: mockCaseHistoryModel },
        { provide: getModelToken("Intervention"), useValue: mockInterventionModel },
        { provide: getModelToken("Quote"), useValue: mockQuoteModel },
        { provide: getModelToken("Comment"), useValue: mockCommentModel },
      ],
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
        steps: [],
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
        steps: [],
      };

      await expect(service.createTemplate(body)).rejects.toThrow(ConflictException);
    });
  });

  describe("listTemplates", () => {
    it("should return templates for organization", async () => {
      const docs = [mockTemplateDoc(), mockTemplateDoc({ _id: { toString: () => "tpl-456" } })];
      mockTemplateModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
      });

      const result = await service.listTemplates("org-1");

      expect(mockTemplateModel.find).toHaveBeenCalledWith({
        organizationId: "org-1",
        ...activeDocumentFilter,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("getTemplate", () => {
    it("should return template when found", async () => {
      const doc = mockTemplateDoc();
      mockTemplateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getTemplate("tpl-123", "org-1");

      expect(mockTemplateModel.findOne).toHaveBeenCalledWith({
        _id: "tpl-123",
        organizationId: "org-1",
        ...activeDocumentFilter,
      });
      expect(result.id).toBe("tpl-123");
    });

    it("should throw NotFoundException when template not found", async () => {
      mockTemplateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getTemplate("non-existent", "org-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteTemplate", () => {
    it("should soft-delete template when found", async () => {
      const result = await service.deleteTemplate("tpl-123", "org-1");

      expect(mockTemplateModel.updateOne).toHaveBeenCalledWith(
        { _id: "tpl-123", organizationId: "org-1", ...activeDocumentFilter },
        { $set: { deletedAt: expect.any(Date) } },
      );
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when template not found", async () => {
      mockTemplateModel.updateOne.mockImplementationOnce(() =>
        updateChain({ matchedCount: 0, modifiedCount: 0 }),
      );

      await expect(service.deleteTemplate("non-existent", "org-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createCase", () => {
    it("should create case without template", async () => {
      const doc = mockCaseDoc();
      mockCaseModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        title: "Case 1",
        description: "Desc",
      };

      const result = await service.createCase(body);

      expect(mockCaseModel.create).toHaveBeenCalled();
      expect(result.id).toBe("case-123");
      expect(result.title).toBe("Case 1");
    });

    it("should create case with template and load steps", async () => {
      const template = mockTemplateDoc({
        steps: [
          {
            name: "Step 1",
            description: "D",
            order: 0,
            todos: [{ label: "Todo 1", description: "D" }],
          },
        ],
      });
      mockTemplateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(template),
      });
      const doc = mockCaseDoc({ steps: [{ id: "s1", name: "Step 1", order: 0, todos: [] }] });
      mockCaseModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        templateId: "tpl-123",
        title: "Case 1",
        description: "Desc",
      };

      const result = await service.createCase(body);

      expect(mockTemplateModel.findOne).toHaveBeenCalledWith({
        _id: "tpl-123",
        organizationId: "org-1",
        ...activeDocumentFilter,
      });
      expect(mockCaseModel.create).toHaveBeenCalled();
      expect(result.id).toBe("case-123");
    });
  });

  describe("listCases", () => {
    it("should return cases with filters", async () => {
      const docs = [mockCaseDoc()];
      mockCaseModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });
      mockCaseModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(docs),
            }),
          }),
        }),
      });

      const result = await service.listCases("org-1", { status: "draft", assigneeId: "user-1" });

      expect(mockCaseModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          ...activeDocumentFilter,
          status: "draft",
          $or: [{ assignees: { $elemMatch: { userId: "user-1" } } }, { assigneeId: "user-1" }],
        }),
      );
      expect(result.cases).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("getCase", () => {
    it("should return case when found", async () => {
      const doc = mockCaseDoc();
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getCase("case-123", "org-1");

      expect(mockCaseModel.findOne).toHaveBeenCalledWith({
        _id: "case-123",
        organizationId: "org-1",
        ...activeDocumentFilter,
      });
      expect(result.id).toBe("case-123");
    });

    it("should throw NotFoundException when case not found", async () => {
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getCase("non-existent", "org-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteCase", () => {
    it("should soft-delete case and interventions", async () => {
      const result = await service.deleteCase("case-123", "org-1");

      expect(mockCaseModel.updateOne).toHaveBeenCalledWith(
        { _id: "case-123", organizationId: "org-1", ...activeDocumentFilter },
        { $set: { deletedAt: expect.any(Date) } },
      );
      expect(mockInterventionModel.updateMany).toHaveBeenCalledWith(
        { caseId: "case-123", organizationId: "org-1", ...activeDocumentFilter },
        { $set: { deletedAt: expect.any(Date) } },
      );
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when case not found", async () => {
      mockCaseModel.updateOne.mockImplementationOnce(() =>
        updateChain({ matchedCount: 0, modifiedCount: 0 }),
      );

      await expect(service.deleteCase("non-existent", "org-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("createIntervention", () => {
    it("should create intervention and increment case count", async () => {
      const caseDoc = mockCaseDoc({ title: "Case 1" });
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(caseDoc),
      });
      const doc = mockInterventionDoc();
      mockInterventionModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        caseId: "case-123",
        title: "Intervention 1",
        description: "Desc",
      };

      const result = await service.createIntervention(body);

      expect(mockCaseModel.findOne).toHaveBeenCalledWith({
        _id: "case-123",
        organizationId: "org-1",
        ...activeDocumentFilter,
      });
      expect(mockInterventionModel.create).toHaveBeenCalled();
      expect(mockCaseModel.updateOne).toHaveBeenCalledWith(
        { _id: "case-123", ...activeDocumentFilter },
        { $inc: { interventionCount: 1 } },
      );
      expect(result.id).toBe("int-123");
    });

    it("should throw NotFoundException when case does not exist", async () => {
      mockCaseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const body = {
        organizationId: "org-1",
        caseId: "non-existent",
        title: "Intervention 1",
        description: "Desc",
      };

      await expect(service.createIntervention(body)).rejects.toThrow(NotFoundException);
      expect(mockInterventionModel.create).not.toHaveBeenCalled();
    });
  });

  describe("deleteIntervention", () => {
    it("should soft-delete intervention and decrement case count", async () => {
      const doc = mockInterventionDoc({ caseId: "case-123" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.deleteIntervention("int-123", "org-1");

      expect(mockInterventionModel.updateOne).toHaveBeenCalledWith(
        { _id: "int-123" },
        { $set: { deletedAt: expect.any(Date) } },
      );
      expect(mockCaseModel.updateOne).toHaveBeenCalledWith(
        { _id: "case-123", ...activeDocumentFilter },
        { $inc: { interventionCount: -1 } },
      );
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when intervention not found", async () => {
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteIntervention("non-existent", "org-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("startIntervention", () => {
    it("should start a planned intervention with timestamp", async () => {
      const doc = mockInterventionDoc({ status: "planned" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.startIntervention("int-123", {
        organizationId: "org-1",
      });

      expect(mockInterventionModel.updateOne).toHaveBeenCalledWith(
        { _id: "int-123" },
        {
          $set: expect.objectContaining({
            status: "in_progress",
            startedAt: expect.any(Date),
          }),
        },
      );
      expect(result.status).toBe("in_progress");
      expect(result.startedAt).toBeDefined();
    });

    it("should include geolocation when provided", async () => {
      const doc = mockInterventionDoc({ status: "planned" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      const location = { latitude: 48.856, longitude: 2.352, accuracy: 10 };

      const result = await service.startIntervention("int-123", {
        organizationId: "org-1",
        location,
      });

      expect(mockInterventionModel.updateOne).toHaveBeenCalledWith(
        { _id: "int-123" },
        {
          $set: expect.objectContaining({
            startLocation: location,
          }),
        },
      );
      expect(result.startLocation).toEqual(location);
    });

    it("should throw ConflictException when status is not planned", async () => {
      const doc = mockInterventionDoc({ status: "in_progress" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.startIntervention("int-123", { organizationId: "org-1" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when intervention is completed", async () => {
      const doc = mockInterventionDoc({ status: "completed" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.startIntervention("int-123", { organizationId: "org-1" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException when intervention not found", async () => {
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.startIntervention("non-existent", { organizationId: "org-1" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("completeIntervention", () => {
    it("should complete an in-progress intervention with timestamp", async () => {
      const doc = mockInterventionDoc({ status: "in_progress" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.completeIntervention("int-123", {
        organizationId: "org-1",
      });

      expect(mockInterventionModel.updateOne).toHaveBeenCalledWith(
        { _id: "int-123" },
        {
          $set: expect.objectContaining({
            status: "completed",
            completedAt: expect.any(Date),
          }),
        },
      );
      expect(result.status).toBe("completed");
      expect(result.completedAt).toBeDefined();
    });

    it("should include notes and geolocation when provided", async () => {
      const doc = mockInterventionDoc({ status: "in_progress" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      const location = { latitude: 48.856, longitude: 2.352 };

      const result = await service.completeIntervention("int-123", {
        organizationId: "org-1",
        notes: "Travaux terminés",
        location,
      });

      expect(mockInterventionModel.updateOne).toHaveBeenCalledWith(
        { _id: "int-123" },
        {
          $set: expect.objectContaining({
            notes: "Travaux terminés",
            endLocation: location,
          }),
        },
      );
      expect(result.endLocation).toEqual(location);
    });

    it("should throw ConflictException when status is not in_progress", async () => {
      const doc = mockInterventionDoc({ status: "planned" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.completeIntervention("int-123", { organizationId: "org-1" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when intervention is already completed", async () => {
      const doc = mockInterventionDoc({ status: "completed" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.completeIntervention("int-123", { organizationId: "org-1" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException when intervention not found", async () => {
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.completeIntervention("non-existent", { organizationId: "org-1" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("addCaseHistory", () => {
    it("should create a history entry", async () => {
      const historyDoc = {
        _id: { toString: () => "hist-1" },
        organizationId: "org-1",
        caseId: "case-123",
        actorId: "user-1",
        actorName: "User One",
        action: "case_created",
        details: "Case 1",
        changes: [],
        get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-06-01") : undefined)),
      };
      mockCaseHistoryModel.create.mockResolvedValue(historyDoc);

      const result = await service.addCaseHistory({
        organizationId: "org-1",
        caseId: "case-123",
        actorId: "user-1",
        actorName: "User One",
        action: "case_created",
        details: "Case 1",
      });

      expect(mockCaseHistoryModel.create).toHaveBeenCalledWith({
        organizationId: "org-1",
        caseId: "case-123",
        actorId: "user-1",
        actorName: "User One",
        action: "case_created",
        details: "Case 1",
        changes: [],
      });
      expect(result.id).toBe("hist-1");
      expect(result.action).toBe("case_created");
      expect(result.actorName).toBe("User One");
    });
  });

  describe("listCaseHistory", () => {
    it("should return history entries for a case", async () => {
      const historyDocs = [
        {
          _id: { toString: () => "hist-1" },
          organizationId: "org-1",
          caseId: "case-123",
          actorId: "user-1",
          actorName: "User One",
          action: "case_created",
          details: "Case 1",
          changes: [],
          get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-06-01") : undefined)),
        },
        {
          _id: { toString: () => "hist-2" },
          organizationId: "org-1",
          caseId: "case-123",
          actorId: "user-1",
          actorName: "User One",
          action: "status_changed",
          changes: [{ field: "status", oldValue: "draft", newValue: "open" }],
          get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-06-02") : undefined)),
        },
      ];

      mockCaseHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(historyDocs),
          }),
        }),
      });

      const result = await service.listCaseHistory("case-123", "org-1");

      expect(mockCaseHistoryModel.find).toHaveBeenCalledWith({
        caseId: "case-123",
        organizationId: "org-1",
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("hist-1");
      expect(result[0].action).toBe("case_created");
      expect(result[1].id).toBe("hist-2");
      expect(result[1].action).toBe("status_changed");
      expect(result[1].changes).toEqual([{ field: "status", oldValue: "draft", newValue: "open" }]);
    });

    it("should return empty array when no history exists", async () => {
      mockCaseHistoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.listCaseHistory("case-456", "org-1");

      expect(result).toEqual([]);
    });
  });

  describe("getDashboardTodoCases", () => {
    it("returns cases when dashboard todo visibility matches user profile", async () => {
      const template = mockTemplateDoc({
        steps: [
          {
            name: "Étape 1",
            order: 0,
            todos: [
              {
                label: "Relancer client",
                dashboardRule: {
                  showOnDashboard: true,
                  visibility: "by_profile",
                  profileIds: ["profile-1"],
                  userIds: [],
                },
              },
            ],
          },
        ],
      });
      mockTemplateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(template),
      });
      mockCaseModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            mockCaseDoc({
              templateId: "tpl-123",
              title: "Dossier A",
              steps: [{ todos: [{ label: "Relancer client", status: "pending" }] }],
            }),
          ]),
        }),
      });

      const result = await service.getDashboardTodoCases(
        "org-1",
        "user-1",
        "profile-1",
        "tpl-123",
        "Relancer client",
      );

      expect(result).toHaveLength(1);
      expect(result[0].caseTitle).toBe("Dossier A");
    });

    it("returns empty when user profile is not allowed", async () => {
      const template = mockTemplateDoc({
        steps: [
          {
            name: "Étape 1",
            order: 0,
            todos: [
              {
                label: "Relancer client",
                dashboardRule: {
                  showOnDashboard: true,
                  visibility: "by_profile",
                  profileIds: ["profile-1"],
                  userIds: [],
                },
              },
            ],
          },
        ],
      });
      mockTemplateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(template),
      });

      const result = await service.getDashboardTodoCases(
        "org-1",
        "user-1",
        "profile-2",
        "tpl-123",
        "Relancer client",
      );

      expect(result).toEqual([]);
      expect(mockCaseModel.find).not.toHaveBeenCalled();
    });
  });

  describe("getDashboardStatCases", () => {
    it("returns assigned active cases for the user", async () => {
      mockCaseModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue([mockCaseDoc({ title: "Dossier actif", status: "open" })]),
          }),
        }),
      });

      const result = await service.getDashboardStatCases("org-1", "user-1", undefined, "assigned");

      expect(mockCaseModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          status: { $nin: ["completed", "cancelled"] },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].caseTitle).toBe("Dossier actif");
    });

    it("returns overdue cases with due date", async () => {
      const past = new Date("2020-01-01");
      mockCaseModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest
              .fn()
              .mockResolvedValue([
                mockCaseDoc({ title: "En retard", dueDate: past, status: "open" }),
              ]),
          }),
        }),
      });

      const result = await service.getDashboardStatCases("org-1", "user-1", undefined, "overdue");

      expect(result).toHaveLength(1);
      expect(result[0].dueDate).toBe(past.toISOString());
    });
  });

  describe("listInterventions", () => {
    it("should query assignee or team assignments when both filters are provided", async () => {
      mockInterventionModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      mockInterventionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockCaseModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      await service.listInterventions("org-1", {
        assigneeId: "user-1",
        assignedTeamIds: ["team-a", "team-b"],
        startDate: "2026-06-06T00:00:00.000Z",
        endDate: "2026-06-06T23:59:59.999Z",
      });

      expect(mockInterventionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          $or: [{ assigneeId: "user-1" }, { assignedTeamId: { $in: ["team-a", "team-b"] } }],
          scheduledStart: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe("signIntervention", () => {
    it("should sign a completed intervention", async () => {
      const doc = mockInterventionDoc({ status: "completed" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.signIntervention("int-123", {
        organizationId: "org-1",
        signatoryName: "Jean Dupont",
        signatureData: "data:image/png;base64,abc123",
      });

      expect(result.id).toBe("int-123");
      expect(result.signatoryName).toBe("Jean Dupont");
      expect(result.signedAt).toBeDefined();
      expect(mockInterventionModel.updateOne).toHaveBeenCalledWith(
        { _id: "int-123" },
        {
          $set: expect.objectContaining({
            signatoryName: "Jean Dupont",
            signatureData: "data:image/png;base64,abc123",
            signedAt: expect.any(Date),
          }),
        },
      );
    });

    it("should reject signing a non-completed intervention", async () => {
      const doc = mockInterventionDoc({ status: "in_progress" });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.signIntervention("int-123", {
          organizationId: "org-1",
          signatoryName: "Jean Dupont",
          signatureData: "data:image/png;base64,abc123",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should reject signing an already signed intervention", async () => {
      const doc = mockInterventionDoc({ status: "completed", signedAt: new Date() });
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.signIntervention("int-123", {
          organizationId: "org-1",
          signatoryName: "Jean Dupont",
          signatureData: "data:image/png;base64,abc123",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException for unknown intervention", async () => {
      mockInterventionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.signIntervention("int-unknown", {
          organizationId: "org-1",
          signatoryName: "Jean Dupont",
          signatureData: "data:image/png;base64,abc123",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getInterventionWithSignature", () => {
    it("should return signature data for a signed intervention", async () => {
      const doc = mockInterventionDoc({
        signatureData: "data:image/png;base64,abc123",
        signatoryName: "Jean Dupont",
      });
      mockInterventionModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(doc),
        }),
      });

      const result = await service.getInterventionWithSignature("int-123", "org-1");

      expect(result.signatureData).toBe("data:image/png;base64,abc123");
      expect(result.signatoryName).toBe("Jean Dupont");
    });

    it("should throw NotFoundException for unknown intervention", async () => {
      mockInterventionModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.getInterventionWithSignature("int-unknown", "org-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
