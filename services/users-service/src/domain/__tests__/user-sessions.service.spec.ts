import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { UserSessionsService } from "../user-sessions.service";
import { AbstractUserSessionsService } from "../ports/user-sessions.service.port";

describe("UserSessionsService presence helpers", () => {
  let service: UserSessionsService;
  let sessionModel: {
    aggregate: jest.Mock;
  };

  beforeEach(async () => {
    sessionModel = {
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractUserSessionsService, useClass: UserSessionsService },
        { provide: getModelToken("User"), useValue: {} },
        { provide: getModelToken("UserSession"), useValue: sessionModel },
      ],
    }).compile();

    service = module.get(AbstractUserSessionsService);
  });

  it("maps latest lastSeenAt by userId", async () => {
    sessionModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { _id: "u1", lastSeenAt: new Date("2026-08-15T10:00:00.000Z") },
        { _id: "u2", lastSeenAt: new Date("2026-08-15T11:00:00.000Z") },
      ]),
    });

    await expect(service.getLatestLastSeenByUserIds(["u1", "u2", "u1"])).resolves.toEqual({
      u1: "2026-08-15T10:00:00.000Z",
      u2: "2026-08-15T11:00:00.000Z",
    });
  });

  it("lists active user ids with pagination", async () => {
    sessionModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { _id: "a", lastSeenAt: new Date("2026-08-15T12:00:00.000Z") },
        { _id: "b", lastSeenAt: new Date("2026-08-15T11:00:00.000Z") },
        { _id: "c", lastSeenAt: new Date("2026-08-15T10:00:00.000Z") },
      ]),
    });

    await expect(
      service.listUserIdsActiveSince(new Date("2026-08-15T09:00:00.000Z"), {
        limit: 2,
        offset: 1,
      }),
    ).resolves.toEqual({ userIds: ["b", "c"], total: 3 });
  });

  it("returns empty when scoped userIds is empty", async () => {
    await expect(service.listUserIdsActiveSince(new Date(), { userIds: [] })).resolves.toEqual({
      userIds: [],
      total: 0,
    });
    expect(sessionModel.aggregate).not.toHaveBeenCalled();
  });
});
