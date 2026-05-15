import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { TeamsController } from "../teams.controller";
import { AbstractTeamsService } from "../../../domain/ports/teams.service.port";

describe("TeamsController", () => {
  let controller: TeamsController;
  let mockTeamsService: jest.Mocked<AbstractTeamsService>;

  beforeEach(async () => {
    mockTeamsService = {
      createTeam: jest.fn(),
      updateTeam: jest.fn(),
      getTeam: jest.fn(),
      listTeams: jest.fn(),
      deleteTeam: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: AbstractTeamsService,
          useValue: mockTeamsService,
        },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createTeam", () => {
    it("should call teamsService.createTeam with body", async () => {
      const body = {
        organizationId: "org-1",
        name: "Équipe A",
      };
      mockTeamsService.createTeam.mockResolvedValue({ id: "t1", ...body } as never);

      const result = await controller.createTeam(body);

      expect(mockTeamsService.createTeam).toHaveBeenCalledWith(body);
      expect(result.id).toBe("t1");
    });
  });

  describe("listTeams", () => {
    it("should call teamsService.listTeams with organizationId", async () => {
      mockTeamsService.listTeams.mockResolvedValue([{ id: "t1" }] as never);

      const result = await controller.listTeams("org-1");

      expect(mockTeamsService.listTeams).toHaveBeenCalledWith("org-1");
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.listTeams(undefined as never)).rejects.toThrow(BadRequestException);
      expect(mockTeamsService.listTeams).not.toHaveBeenCalled();
    });
  });

  describe("getTeam", () => {
    it("should call teamsService.getTeam with id and organizationId", async () => {
      mockTeamsService.getTeam.mockResolvedValue({ id: "t1" } as never);

      const result = await controller.getTeam("t1", "org-1");

      expect(mockTeamsService.getTeam).toHaveBeenCalledWith("org-1", "t1");
      expect(result.id).toBe("t1");
    });
  });

  describe("updateTeam", () => {
    it("should call teamsService.updateTeam with organizationId, id, and body", async () => {
      const body = { name: "Équipe B" };
      mockTeamsService.updateTeam.mockResolvedValue({ id: "t1", name: "Équipe B" } as never);

      const result = await controller.updateTeam("t1", "org-1", body);

      expect(mockTeamsService.updateTeam).toHaveBeenCalledWith("org-1", "t1", body);
      expect(result.name).toBe("Équipe B");
    });
  });

  describe("deleteTeam", () => {
    it("should call teamsService.deleteTeam with id and organizationId", async () => {
      mockTeamsService.deleteTeam.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteTeam("t1", "org-1");

      expect(mockTeamsService.deleteTeam).toHaveBeenCalledWith("org-1", "t1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("addMember", () => {
    it("should call teamsService.addMember with organizationId, id, and technicianId", async () => {
      mockTeamsService.addMember.mockResolvedValue({
        id: "t1",
        technicianIds: ["tech-1"],
      } as never);

      const result = await controller.addMember("t1", "tech-1", "org-1");

      expect(mockTeamsService.addMember).toHaveBeenCalledWith("org-1", "t1", "tech-1");
      expect(result.technicianIds).toContain("tech-1");
    });
  });

  describe("removeMember", () => {
    it("should call teamsService.removeMember with organizationId, id, and technicianId", async () => {
      mockTeamsService.removeMember.mockResolvedValue({
        id: "t1",
        technicianIds: [],
      } as never);

      const result = await controller.removeMember("t1", "tech-1", "org-1");

      expect(mockTeamsService.removeMember).toHaveBeenCalledWith("org-1", "t1", "tech-1");
      expect(result.technicianIds).toHaveLength(0);
    });
  });
});
