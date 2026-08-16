import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import {
  addDaysDateOnly,
  addMonthsDateOnly,
  MaintenanceContractsService,
} from "../maintenance-contracts.service";
import { AbstractCasesService } from "../ports/cases.service.port";

describe("addMonthsDateOnly", () => {
  it("ajoute des mois simples", () => {
    expect(addMonthsDateOnly("2026-01-15", 1)).toBe("2026-02-15");
    expect(addMonthsDateOnly("2026-01-15", 12)).toBe("2027-01-15");
  });

  it("gère le débordement de fin de mois", () => {
    expect(addMonthsDateOnly("2026-01-31", 1)).toBe("2026-03-03");
  });
});

describe("addDaysDateOnly", () => {
  it("ajoute et soustrait des jours", () => {
    expect(addDaysDateOnly("2026-03-15", 14)).toBe("2026-03-29");
    expect(addDaysDateOnly("2026-03-15", -14)).toBe("2026-03-01");
  });
});

describe("MaintenanceContractsService", () => {
  let service: MaintenanceContractsService;
  let mockContractModel: {
    findOne: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
  };
  let mockCasesService: {
    createCase: jest.Mock;
    createIntervention: jest.Mock;
    getTemplate: jest.Mock;
  };

  const orgId = "org-1";
  const contractId = "contract-1";

  const mockContractDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => contractId },
    organizationId: orgId,
    customerId: "cust-1",
    siteId: "site-1",
    templateId: "tpl-1",
    title: "Entretien chaudière",
    description: "Visite annuelle",
    status: "active",
    startDate: "2026-01-01",
    endDate: undefined,
    recurrenceMonths: 12,
    nextDueDate: "2026-03-15",
    schedulingMode: "schedule_with_client",
    remindBeforeDays: 14,
    schedulingPending: false,
    reminderSentForDueDate: undefined,
    defaultAssigneeId: undefined,
    defaultTeamId: undefined,
    visitHistory: [] as Array<{
      caseId: string;
      interventionId: string;
      dueDate: string;
      generatedAt: string;
    }>,
    deletedAt: null as Date | null,
    save: jest.fn().mockResolvedValue(undefined),
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  });

  beforeEach(async () => {
    mockContractModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    mockCasesService = {
      createCase: jest.fn().mockResolvedValue({ id: "case-1" }),
      createIntervention: jest.fn().mockResolvedValue({ id: "int-1" }),
      getTemplate: jest.fn().mockResolvedValue({ id: "tpl-1", name: "Maintenance" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceContractsService,
        { provide: getModelToken("MaintenanceContract"), useValue: mockContractModel },
        { provide: AbstractCasesService, useValue: mockCasesService },
      ],
    }).compile();

    service = module.get(MaintenanceContractsService);
  });

  describe("create", () => {
    it("applique le mode à programmer et rappel 14 jours par défaut", async () => {
      const doc = mockContractDoc();
      mockContractModel.create.mockResolvedValue(doc);

      const result = await service.create({
        organizationId: orgId,
        customerId: "cust-1",
        title: "Entretien chaudière",
        startDate: "2026-01-01",
        recurrenceMonths: 12,
      });

      expect(mockContractModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          schedulingMode: "schedule_with_client",
          remindBeforeDays: 14,
          schedulingPending: false,
        }),
      );
      expect(result.schedulingMode).toBe("schedule_with_client");
      expect(result.remindBeforeDays).toBe(14);
    });
  });

  describe("generateVisit", () => {
    it("passe le templateId du contrat à createCase", async () => {
      const doc = mockContractDoc({ visitHistory: [] });
      mockContractModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const result = await service.generateVisit(orgId, contractId);

      expect(mockCasesService.createCase).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          templateId: "tpl-1",
          customerId: "cust-1",
          interventionSiteId: "site-1",
          title: "Maintenance — Entretien chaudière",
        }),
      );
      expect(result.caseId).toBe("case-1");
      expect(result.interventionId).toBe("int-1");
      expect(doc.nextDueDate).toBe("2027-03-15");
      expect(doc.schedulingPending).toBe(false);
      expect(doc.reminderSentForDueDate).toBeUndefined();
      expect(doc.visitHistory).toHaveLength(1);
    });

    it("accepte des horaires personnalisés (programmation)", async () => {
      const doc = mockContractDoc({
        schedulingPending: true,
        reminderSentForDueDate: "2026-03-15",
      });
      mockContractModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });

      await service.generateVisit(orgId, contractId, {
        scheduledStart: "2026-03-20T09:00:00.000Z",
        scheduledEnd: "2026-03-20T11:00:00.000Z",
      });

      expect(mockCasesService.createIntervention).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledStart: "2026-03-20T09:00:00.000Z",
          scheduledEnd: "2026-03-20T11:00:00.000Z",
        }),
      );
      expect(doc.schedulingPending).toBe(false);
      expect(doc.reminderSentForDueDate).toBeUndefined();
    });

    it("ajoute chaque génération en tête de l’historique", async () => {
      const doc = mockContractDoc({
        visitHistory: [
          {
            caseId: "case-old",
            interventionId: "int-old",
            dueDate: "2025-03-15",
            generatedAt: "2025-03-15T08:00:00.000Z",
          },
        ],
      });
      mockContractModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });

      await service.generateVisit(orgId, contractId);

      expect(doc.visitHistory).toHaveLength(2);
      expect(doc.visitHistory[0].caseId).toBe("case-1");
      expect(doc.visitHistory[1].caseId).toBe("case-old");
    });

    it("crée un dossier sans template si le contrat n’en a pas", async () => {
      const doc = mockContractDoc({ templateId: undefined, visitHistory: [] });
      mockContractModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });

      await service.generateVisit(orgId, contractId);

      expect(mockCasesService.createCase).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: undefined,
        }),
      );
    });

    it("refuse la génération si le contrat n’est pas actif", async () => {
      const doc = mockContractDoc({ status: "draft" });
      mockContractModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });

      await expect(service.generateVisit(orgId, contractId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockCasesService.createCase).not.toHaveBeenCalled();
    });
  });

  describe("processDueContracts", () => {
    it("marque schedulingPending pour schedule_with_client sans générer", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

      const doc = mockContractDoc({
        nextDueDate: "2026-03-15",
        schedulingMode: "schedule_with_client",
        remindBeforeDays: 14,
        schedulingPending: false,
      });
      mockContractModel.find.mockReturnValue({ exec: () => Promise.resolve([doc]) });

      const result = await service.processDueContracts();

      expect(mockCasesService.createCase).not.toHaveBeenCalled();
      expect(doc.schedulingPending).toBe(true);
      expect(doc.save).toHaveBeenCalled();
      expect(result.succeeded).toBe(1);

      jest.useRealTimers();
    });

    it("génère automatiquement pour auto_plan à échéance", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));

      const doc = mockContractDoc({
        nextDueDate: "2026-03-15",
        schedulingMode: "auto_plan",
      });
      mockContractModel.find.mockReturnValue({ exec: () => Promise.resolve([doc]) });
      mockContractModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const result = await service.processDueContracts();

      expect(mockCasesService.createCase).toHaveBeenCalled();
      expect(result.succeeded).toBe(1);

      jest.useRealTimers();
    });

    it("ne génère pas auto_plan avant l’échéance", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

      const doc = mockContractDoc({
        nextDueDate: "2026-03-15",
        schedulingMode: "auto_plan",
      });
      mockContractModel.find.mockReturnValue({ exec: () => Promise.resolve([doc]) });

      const result = await service.processDueContracts();

      expect(mockCasesService.createCase).not.toHaveBeenCalled();
      expect(result.skipped).toBe(1);

      jest.useRealTimers();
    });
  });

  describe("listVisitsToSchedule", () => {
    it("retourne les contrats dans la fenêtre de rappel", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

      const inWindow = mockContractDoc({
        nextDueDate: "2026-03-15",
        remindBeforeDays: 14,
      });
      const tooEarly = mockContractDoc({
        _id: { toString: () => "contract-2" },
        nextDueDate: "2026-04-30",
        remindBeforeDays: 7,
      });
      mockContractModel.find.mockReturnValue({
        sort: () => ({
          limit: () => ({
            exec: () => Promise.resolve([inWindow, tooEarly]),
          }),
        }),
      });

      const items = await service.listVisitsToSchedule(orgId);

      expect(items).toHaveLength(1);
      expect(items[0].contractId).toBe(contractId);
      expect(items[0].overdue).toBe(false);

      jest.useRealTimers();
    });
  });

  describe("markReminded", () => {
    it("enregistre reminderSentForDueDate", async () => {
      const doc = mockContractDoc({ nextDueDate: "2026-03-15", schedulingPending: true });
      mockContractModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const result = await service.markReminded(orgId, contractId);

      expect(doc.reminderSentForDueDate).toBe("2026-03-15");
      expect(result.reminderSentForDueDate).toBe("2026-03-15");
    });
  });

  describe("remove", () => {
    it("soft-delete le contrat", async () => {
      const doc = mockContractDoc();
      mockContractModel.findOne.mockReturnValue({ exec: () => Promise.resolve(doc) });

      const result = await service.remove(orgId, contractId);

      expect(doc.deletedAt).toEqual(expect.any(Date));
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });
  });

  it("valide le template à la création", async () => {
    mockCasesService.getTemplate.mockRejectedValue(
      new NotFoundException("Case template not found"),
    );

    await expect(
      service.create({
        organizationId: orgId,
        customerId: "cust-1",
        title: "Contrat",
        startDate: "2026-01-01",
        recurrenceMonths: 6,
        templateId: "missing-tpl",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mockCasesService.getTemplate).toHaveBeenCalledWith("missing-tpl", orgId);
    expect(mockContractModel.create).not.toHaveBeenCalled();
  });
});
