import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { TeamsService } from "../teams.service";

describe("TeamsService", () => {
  let service: TeamsService;
  let mockTeamModel: {
    create: jest.Mock;
    findById: jest.Mock;
    find: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let mockAgenceModel: {
    find: jest.Mock;
  };

  const mockTeamDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "team-123" },
    organizationId: "org-1",
    name: "Équipe A",
    agenceId: "agence-1",
    technicianIds: ["tech-1", "tech-2"],
    status: "active",
    calendarColor: "#FF0000",
    get: jest.fn((key: string) =>
      key === "createdAt"
        ? new Date("2025-01-01")
        : key === "updatedAt"
          ? new Date("2025-01-02")
          : undefined,
    ),
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(async () => {
    const execMock = jest.fn();

    mockTeamModel = {
      create: jest.fn(),
      findById: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: execMock }),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
    };

    mockAgenceModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ exec: execMock }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getModelToken("Team"), useValue: mockTeamModel },
        { provide: getModelToken("Agence"), useValue: mockAgenceModel },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createTeam", () => {
    it("should create team and return response", async () => {
      const doc = mockTeamDoc();
      mockTeamModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        name: "Équipe A",
        agenceId: "agence-1",
        technicianIds: ["tech-1", "tech-2"],
      };

      const result = await service.createTeam(body);

      expect(mockTeamModel.create).toHaveBeenCalledWith({
        organizationId: "org-1",
        name: "Équipe A",
        agenceId: "agence-1",
        technicianIds: ["tech-1", "tech-2"],
        status: "active",
        calendarColor: undefined,
      });
      expect(result.id).toBe("team-123");
      expect(result.name).toBe("Équipe A");
    });

    it("should throw ConflictException on duplicate (code 11000)", async () => {
      mockTeamModel.create.mockRejectedValue({ code: 11000 });

      const body = {
        organizationId: "org-1",
        name: "Équipe A",
      };

      await expect(service.createTeam(body)).rejects.toThrow(ConflictException);
    });

    it("should accept valid #RGB calendarColor", async () => {
      const doc = mockTeamDoc({ calendarColor: "#FF0000" });
      mockTeamModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        name: "Équipe A",
        calendarColor: "#F00",
      };

      const result = await service.createTeam(body);

      expect(mockTeamModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ calendarColor: "#FF0000" }),
      );
      expect(result.calendarColor).toBe("#FF0000");
    });

    it("should accept valid #RRGGBB calendarColor", async () => {
      const doc = mockTeamDoc({ calendarColor: "#AABB00" });
      mockTeamModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        name: "Équipe A",
        calendarColor: "#aabb00",
      };

      const result = await service.createTeam(body);

      expect(mockTeamModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ calendarColor: "#AABB00" }),
      );
      expect(result.calendarColor).toBe("#AABB00");
    });

    it("should throw BadRequestException for invalid calendarColor", async () => {
      const body = {
        organizationId: "org-1",
        name: "Équipe A",
        calendarColor: "not-a-color",
      };

      await expect(service.createTeam(body)).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateTeam", () => {
    it("should update fields and save", async () => {
      const doc = mockTeamDoc();
      mockTeamModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.updateTeam("org-1", "team-123", {
        name: "Équipe B",
      });

      expect(doc.name).toBe("Équipe B");
      expect(doc.save).toHaveBeenCalled();
      expect(result.id).toBe("team-123");
    });

    it("should throw NotFoundException when not found", async () => {
      mockTeamModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.updateTeam("org-1", "non-existent", { name: "Test" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getTeam", () => {
    it("should return team when found", async () => {
      const doc = mockTeamDoc();
      mockTeamModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getTeam("org-1", "team-123");

      expect(mockTeamModel.findById).toHaveBeenCalledWith("team-123");
      expect(result.id).toBe("team-123");
      expect(result.name).toBe("Équipe A");
    });

    it("should throw NotFoundException when not found", async () => {
      mockTeamModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getTeam("org-1", "non-existent")).rejects.toThrow(NotFoundException);
    });
  });

  describe("listTeams", () => {
    it("should return list with agence names", async () => {
      const docs = [
        mockTeamDoc({ agenceId: "agence-1" }),
        mockTeamDoc({ _id: { toString: () => "team-456" }, agenceId: "agence-2" }),
      ];
      mockTeamModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
      });

      const agenceDocs = [
        { _id: { toString: () => "agence-1" }, name: "Agence Paris" },
        { _id: { toString: () => "agence-2" }, name: "Agence Lyon" },
      ];
      mockAgenceModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(agenceDocs) }),
      });

      const result = await service.listTeams("org-1");

      expect(mockTeamModel.find).toHaveBeenCalledWith({ organizationId: "org-1" });
      expect(result).toHaveLength(2);
      expect(result[0].agenceName).toBe("Agence Paris");
      expect(result[1].agenceName).toBe("Agence Lyon");
    });
  });

  describe("deleteTeam", () => {
    it("should delete team when found", async () => {
      const doc = mockTeamDoc();
      mockTeamModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.deleteTeam("org-1", "team-123");

      expect(doc.deleteOne).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("addMember", () => {
    it("should add technician to team", async () => {
      const doc = mockTeamDoc({ technicianIds: ["tech-1"] });
      mockTeamModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.addMember("org-1", "team-123", "tech-2");

      expect(doc.technicianIds).toContain("tech-2");
      expect(doc.save).toHaveBeenCalled();
      expect(result.id).toBe("team-123");
    });
  });

  describe("removeMember", () => {
    it("should remove technician from team", async () => {
      const doc = mockTeamDoc({ technicianIds: ["tech-1"] });
      mockTeamModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.removeMember("org-1", "team-123", "tech-2");

      expect(mockTeamModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "team-123", organizationId: "org-1" },
        { $pull: { technicianIds: "tech-2" } },
        { new: true },
      );
      expect(result.id).toBe("team-123");
    });

    it("should throw NotFoundException when team not found", async () => {
      mockTeamModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.removeMember("org-1", "non-existent", "tech-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
