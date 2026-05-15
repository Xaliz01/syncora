import { Test, TestingModule } from "@nestjs/testing";
import { TeamsGatewayController } from "../teams.controller";
import { AbstractTeamsGatewayService } from "../../../domain/ports/teams.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

describe("TeamsGatewayController", () => {
  let controller: TeamsGatewayController;
  let mockTeamsService: jest.Mocked<AbstractTeamsGatewayService>;

  const mockUser: AuthUser = {
    id: "user-123",
    email: "admin@example.com",
    organizationId: "org-123",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin User",
  };

  beforeEach(async () => {
    mockTeamsService = {
      createTeam: jest.fn(),
      listTeams: jest.fn(),
      getTeam: jest.fn(),
      updateTeam: jest.fn(),
      deleteTeam: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsGatewayController],
      providers: [
        {
          provide: AbstractTeamsGatewayService,
          useValue: mockTeamsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequirePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TeamsGatewayController>(TeamsGatewayController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createTeam", () => {
    it("should call teamsService.createTeam with user and body", async () => {
      const body = { name: "Team Alpha", technicianIds: ["tech-1"] };
      mockTeamsService.createTeam.mockResolvedValue({ id: "team-1", name: "Team Alpha" } as never);

      const result = await controller.createTeam(mockUser, body);

      expect(mockTeamsService.createTeam).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "team-1", name: "Team Alpha" });
    });
  });

  describe("listTeams", () => {
    it("should call teamsService.listTeams with user", async () => {
      mockTeamsService.listTeams.mockResolvedValue([{ id: "team-1" }] as never);

      const result = await controller.listTeams(mockUser);

      expect(mockTeamsService.listTeams).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([{ id: "team-1" }]);
    });
  });

  describe("getTeam", () => {
    it("should call teamsService.getTeam with user and teamId", async () => {
      mockTeamsService.getTeam.mockResolvedValue({ id: "team-1" } as never);

      const result = await controller.getTeam(mockUser, "team-1");

      expect(mockTeamsService.getTeam).toHaveBeenCalledWith(mockUser, "team-1");
      expect(result).toEqual({ id: "team-1" });
    });
  });

  describe("updateTeam", () => {
    it("should call teamsService.updateTeam with user, teamId and body", async () => {
      const body = { name: "Team Beta" };
      mockTeamsService.updateTeam.mockResolvedValue({ id: "team-1", name: "Team Beta" } as never);

      const result = await controller.updateTeam(mockUser, "team-1", body);

      expect(mockTeamsService.updateTeam).toHaveBeenCalledWith(mockUser, "team-1", body);
      expect(result).toEqual({ id: "team-1", name: "Team Beta" });
    });
  });

  describe("deleteTeam", () => {
    it("should call teamsService.deleteTeam with user and teamId", async () => {
      mockTeamsService.deleteTeam.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteTeam(mockUser, "team-1");

      expect(mockTeamsService.deleteTeam).toHaveBeenCalledWith(mockUser, "team-1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("addMember", () => {
    it("should call teamsService.addMember with user, teamId and technicianId", async () => {
      mockTeamsService.addMember.mockResolvedValue({ id: "team-1", members: ["tech-1"] } as never);

      const result = await controller.addMember(mockUser, "team-1", "tech-1");

      expect(mockTeamsService.addMember).toHaveBeenCalledWith(mockUser, "team-1", "tech-1");
      expect(result).toEqual({ id: "team-1", members: ["tech-1"] });
    });
  });

  describe("removeMember", () => {
    it("should call teamsService.removeMember with user, teamId and technicianId", async () => {
      mockTeamsService.removeMember.mockResolvedValue({ id: "team-1", members: [] } as never);

      const result = await controller.removeMember(mockUser, "team-1", "tech-1");

      expect(mockTeamsService.removeMember).toHaveBeenCalledWith(mockUser, "team-1", "tech-1");
      expect(result).toEqual({ id: "team-1", members: [] });
    });
  });
});
