import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { AnalyticsService } from "../analytics.service";
import { AbstractAnalyticsService } from "../ports/analytics.service.port";

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let mockPageViewModel: {
    create: jest.Mock;
    aggregate: jest.Mock;
    countDocuments: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    mockPageViewModel = {
      create: jest.fn().mockResolvedValue({}),
      aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractAnalyticsService, useClass: AnalyticsService },
        { provide: getModelToken("PageView"), useValue: mockPageViewModel },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AbstractAnalyticsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("trackPageview", () => {
    const validBody = {
      surface: "marketing" as const,
      path: "/pricing?x=1",
      visitorId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      referrerHost: "https://google.com/search",
      authenticated: false,
    };

    it("persists a normalized pageview", async () => {
      const result = await service.trackPageview(validBody);

      expect(result).toEqual({ ok: true });
      expect(mockPageViewModel.create).toHaveBeenCalledWith({
        surface: "marketing",
        path: "/pricing",
        referrerHost: "google.com",
        visitorId: validBody.visitorId,
        sessionId: validBody.sessionId,
        authenticated: false,
      });
    });

    it("persists country and region when provided by gateway", async () => {
      await service.trackPageview({
        ...validBody,
        country: "fr",
        region: "idf",
      });

      expect(mockPageViewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          country: "FR",
          region: "IDF",
        }),
      );
    });

    it("rejects invalid surface", async () => {
      await expect(
        service.trackPageview({
          ...validBody,
          surface: "other" as "marketing",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects invalid visitor/session ids", async () => {
      await expect(
        service.trackPageview({
          ...validBody,
          visitorId: "not-a-uuid",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects path traversal", async () => {
      await expect(
        service.trackPageview({
          ...validBody,
          path: "/../secret",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("skips persisting platform surface", async () => {
      const result = await service.trackPageview({
        ...validBody,
        surface: "platform",
        path: "/platform",
      });
      expect(result).toEqual({ ok: true });
      expect(mockPageViewModel.create).not.toHaveBeenCalled();
    });

    it("skips persisting excluded email domains", async () => {
      const result = await service.trackPageview({
        ...validBody,
        surface: "app",
        path: "/login",
        emailDomain: "planwise.test",
      });
      expect(result).toEqual({ ok: true });
      expect(mockPageViewModel.create).not.toHaveBeenCalled();
    });

    it("skips persisting domains containing hugobabin / benoistbabin", async () => {
      const result = await service.trackPageview({
        ...validBody,
        surface: "app",
        path: "/login",
        emailDomain: "mail.hugobabin.org",
      });
      expect(result).toEqual({ ok: true });
      expect(mockPageViewModel.create).not.toHaveBeenCalled();
    });

    it("persists emailDomain for non-excluded accounts", async () => {
      await service.trackPageview({
        ...validBody,
        surface: "app",
        path: "/cases",
        emailDomain: "exemple.fr",
        authenticated: true,
      });
      expect(mockPageViewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          emailDomain: "exemple.fr",
          authenticated: true,
        }),
      );
    });
  });

  describe("getOverview", () => {
    it("returns empty totals when no pageviews", async () => {
      const overview = await service.getOverview(7);

      expect(overview.days).toBe(7);
      expect(overview.totals).toEqual({ pageviews: 0, visitors: 0, sessions: 0 });
      expect(overview.byDay).toHaveLength(7);
      expect(overview.bySurface).toEqual([]);
      expect(overview.topPaths).toEqual([]);
      expect(overview.topCountries).toEqual([]);
      const firstMatch = mockPageViewModel.aggregate.mock.calls[0][0][0].$match;
      expect(firstMatch.surface).toEqual({ $in: ["marketing", "app"] });
      expect(firstMatch.emailDomain.$not).toBeInstanceOf(RegExp);
      expect(firstMatch.emailDomain.$not.test("planwise.test")).toBe(true);
      expect(firstMatch.emailDomain.$not.test("mail.hugobabin.org")).toBe(true);
      expect(firstMatch.emailDomain.$not.test("exemple.fr")).toBe(false);
    });

    it("maps aggregation rows", async () => {
      mockPageViewModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            {
              pageviews: 10,
              visitors: ["a", "b"],
              sessions: ["s1", "s2", "s3"],
            },
          ]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            { _id: "app", pageviews: 4, visitors: ["b"] },
            { _id: "marketing", pageviews: 6, visitors: ["a"] },
          ]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            {
              _id: new Date().toISOString().slice(0, 10),
              pageviews: 3,
              visitors: ["a"],
              sessions: ["s1"],
            },
          ]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([{ _id: "/", pageviews: 5 }]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([{ _id: "FR", pageviews: 8, visitors: ["a", "b"] }]),
        });

      const overview = await service.getOverview(1);

      expect(overview.totals).toEqual({ pageviews: 10, visitors: 2, sessions: 3 });
      expect(overview.bySurface).toEqual([
        { surface: "marketing", pageviews: 6, visitors: 1 },
        { surface: "app", pageviews: 4, visitors: 1 },
      ]);
      expect(overview.topPaths).toEqual([{ path: "/", pageviews: 5 }]);
      expect(overview.topCountries).toEqual([{ country: "FR", pageviews: 8, visitors: 2 }]);
      expect(overview.byDay).toHaveLength(1);
    });
  });

  describe("listLandingVisits", () => {
    it("returns empty landing visits", async () => {
      const res = await service.listLandingVisits({ days: 7, limit: 50, offset: 0 });
      expect(res.days).toBe(7);
      expect(res.totals).toEqual({ pageviews: 0, visitors: 0, sessions: 0 });
      expect(res.items).toEqual([]);
      expect(res.total).toBe(0);
    });

    it("marks returning visitors and short keys", async () => {
      const visitorA = "11111111-1111-4111-8111-111111111111";
      const visitorB = "22222222-2222-4222-8222-222222222222";
      const firstAt = new Date("2026-08-01T10:00:00.000Z");
      const secondAt = new Date("2026-08-02T11:00:00.000Z");

      mockPageViewModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            {
              pageviews: 3,
              visitors: [visitorA, visitorB],
              sessions: ["s1", "s2"],
            },
          ]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            { _id: visitorA, firstAt },
            { _id: visitorB, firstAt: secondAt },
          ]),
        });
      mockPageViewModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(3) });
      mockPageViewModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          {
            _id: "v2",
            path: "/",
            visitorId: visitorA,
            sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            country: "FR",
            createdAt: secondAt,
          },
          {
            _id: "v1",
            path: "/",
            visitorId: visitorA,
            sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            createdAt: firstAt,
          },
          {
            _id: "v3",
            path: "/",
            visitorId: visitorB,
            sessionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            referrerHost: "google.com",
            createdAt: secondAt,
          },
        ]),
      });

      const res = await service.listLandingVisits({ days: 30, limit: 50, offset: 0 });

      expect(res.total).toBe(3);
      expect(res.totals.visitors).toBe(2);
      expect(res.items[0]).toEqual(
        expect.objectContaining({
          id: "v2",
          visitorKey: "11111111",
          isReturningVisitor: true,
          country: "FR",
        }),
      );
      expect(res.items[1]).toEqual(
        expect.objectContaining({
          id: "v1",
          visitorKey: "11111111",
          isReturningVisitor: false,
        }),
      );
      expect(res.items[2]).toEqual(
        expect.objectContaining({
          id: "v3",
          visitorKey: "22222222",
          isReturningVisitor: false,
          referrerHost: "google.com",
        }),
      );
    });
  });

  describe("listLandingToAppVisits", () => {
    it("filters app pageviews referred from marketing hosts", async () => {
      const prev = process.env.MARKETING_DOMAIN;
      process.env.MARKETING_DOMAIN = "planwise.fr";

      const visitorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      const viewedAt = new Date("2026-08-03T09:00:00.000Z");

      mockPageViewModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            {
              pageviews: 1,
              visitors: [visitorId],
              sessions: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
            },
          ]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([{ _id: visitorId, firstAt: viewedAt }]),
        });
      mockPageViewModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
      mockPageViewModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          {
            _id: "app1",
            path: "/login",
            visitorId,
            sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            referrerHost: "planwise.fr",
            country: "FR",
            createdAt: viewedAt,
          },
        ]),
      });

      try {
        const res = await service.listLandingToAppVisits({ days: 7, limit: 50, offset: 0 });

        expect(mockPageViewModel.find).toHaveBeenCalledWith(
          expect.objectContaining({
            surface: "app",
            referrerHost: { $in: ["planwise.fr", "www.planwise.fr"] },
          }),
        );
        expect(res.totals.pageviews).toBe(1);
        expect(res.items[0]).toEqual(
          expect.objectContaining({
            id: "app1",
            path: "/login",
            referrerHost: "planwise.fr",
            isReturningVisitor: false,
            visitorKey: "aaaaaaaa",
          }),
        );
      } finally {
        if (prev === undefined) delete process.env.MARKETING_DOMAIN;
        else process.env.MARKETING_DOMAIN = prev;
      }
    });
  });
});
