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
  };

  beforeEach(async () => {
    mockPageViewModel = {
      create: jest.fn().mockResolvedValue({}),
      aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
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
});
