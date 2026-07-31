import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type {
  AnalyticsSurface,
  PlatformAnalyticsOverviewResponse,
  TrackPageviewBody,
  TrackPageviewResponse,
} from "@planwise/shared";
import type { PageViewDocument } from "../persistence/page-view.schema";
import { AbstractAnalyticsService } from "./ports/analytics.service.port";

const MAX_PATH_LENGTH = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SURFACES = new Set<AnalyticsSurface>(["marketing", "app", "platform"]);

@Injectable()
export class AnalyticsService extends AbstractAnalyticsService {
  constructor(
    @InjectModel("PageView")
    private readonly pageViewModel: Model<PageViewDocument>,
  ) {
    super();
  }

  async trackPageview(body: TrackPageviewBody): Promise<TrackPageviewResponse> {
    const surface = body.surface;
    if (!SURFACES.has(surface)) {
      throw new BadRequestException("surface invalide");
    }

    const path = this.normalizePath(body.path);
    const visitorId = body.visitorId?.trim() ?? "";
    const sessionId = body.sessionId?.trim() ?? "";
    if (!UUID_RE.test(visitorId) || !UUID_RE.test(sessionId)) {
      throw new BadRequestException("visitorId/sessionId invalides");
    }

    const referrerHost = this.normalizeReferrerHost(body.referrerHost);
    const country = this.normalizeCountry(body.country);
    const region = this.normalizeRegion(body.region);

    await this.pageViewModel.create({
      surface,
      path,
      referrerHost,
      visitorId,
      sessionId,
      authenticated: body.authenticated === true,
      ...(country ? { country } : {}),
      ...(region ? { region } : {}),
    });

    return { ok: true };
  }

  async getOverview(days = 30): Promise<PlatformAnalyticsOverviewResponse> {
    const windowDays = Math.min(Math.max(Math.floor(days) || 30, 1), 90);
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - (windowDays - 1));
    from.setUTCHours(0, 0, 0, 0);

    const match = { createdAt: { $gte: from, $lte: to } };

    const [totalsAgg, bySurface, byDay, topPaths, topCountries] = await Promise.all([
      this.pageViewModel
        .aggregate<{ pageviews: number; visitors: string[]; sessions: string[] }>([
          { $match: match },
          {
            $group: {
              _id: null,
              pageviews: { $sum: 1 },
              visitors: { $addToSet: "$visitorId" },
              sessions: { $addToSet: "$sessionId" },
            },
          },
        ])
        .exec(),
      this.pageViewModel
        .aggregate<{ _id: AnalyticsSurface; pageviews: number; visitors: string[] }>([
          { $match: match },
          {
            $group: {
              _id: "$surface",
              pageviews: { $sum: 1 },
              visitors: { $addToSet: "$visitorId" },
            },
          },
          { $sort: { pageviews: -1 } },
        ])
        .exec(),
      this.pageViewModel
        .aggregate<{ _id: string; pageviews: number; visitors: string[]; sessions: string[] }>([
          { $match: match },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
              },
              pageviews: { $sum: 1 },
              visitors: { $addToSet: "$visitorId" },
              sessions: { $addToSet: "$sessionId" },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec(),
      this.pageViewModel
        .aggregate<{
          _id: string;
          pageviews: number;
        }>([
          { $match: match },
          { $group: { _id: "$path", pageviews: { $sum: 1 } } },
          { $sort: { pageviews: -1 } },
          { $limit: 20 },
        ])
        .exec(),
      this.pageViewModel
        .aggregate<{ _id: string; pageviews: number; visitors: string[] }>([
          { $match: { ...match, country: { $exists: true, $nin: [null, ""] } } },
          {
            $group: {
              _id: "$country",
              pageviews: { $sum: 1 },
              visitors: { $addToSet: "$visitorId" },
            },
          },
          { $sort: { pageviews: -1 } },
          { $limit: 15 },
        ])
        .exec(),
    ]);

    const totalsRow = totalsAgg[0];
    const dayMap = new Map(
      byDay.map((row) => [
        row._id,
        {
          date: row._id,
          pageviews: row.pageviews,
          visitors: row.visitors.length,
          sessions: row.sessions.length,
        },
      ]),
    );

    const byDayFilled = [];
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(from);
      d.setUTCDate(from.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDayFilled.push(dayMap.get(key) ?? { date: key, pageviews: 0, visitors: 0, sessions: 0 });
    }

    return {
      days: windowDays,
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        pageviews: totalsRow?.pageviews ?? 0,
        visitors: totalsRow?.visitors.length ?? 0,
        sessions: totalsRow?.sessions.length ?? 0,
      },
      bySurface: [...bySurface]
        .sort((a, b) => b.pageviews - a.pageviews)
        .map((row) => ({
          surface: row._id,
          pageviews: row.pageviews,
          visitors: row.visitors.length,
        })),
      byDay: byDayFilled,
      topPaths: topPaths.map((row) => ({
        path: row._id,
        pageviews: row.pageviews,
      })),
      topCountries: topCountries.map((row) => ({
        country: row._id,
        pageviews: row.pageviews,
        visitors: row.visitors.length,
      })),
    };
  }

  private normalizePath(raw: string): string {
    let path = (raw ?? "").trim();
    if (!path.startsWith("/")) path = `/${path}`;
    const q = path.indexOf("?");
    if (q >= 0) path = path.slice(0, q);
    const h = path.indexOf("#");
    if (h >= 0) path = path.slice(0, h);
    path = path.replace(/\/{2,}/g, "/");
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    if (path.length > MAX_PATH_LENGTH) path = path.slice(0, MAX_PATH_LENGTH);
    if (!path || path.includes("..")) {
      throw new BadRequestException("path invalide");
    }
    return path;
  }

  private normalizeReferrerHost(raw?: string): string | undefined {
    const value = raw?.trim().toLowerCase();
    if (!value) return undefined;
    try {
      if (value.includes("://")) {
        return new URL(value).hostname.slice(0, 100) || undefined;
      }
      return value.replace(/[^a-z0-9.-]/g, "").slice(0, 100) || undefined;
    } catch {
      return undefined;
    }
  }

  private normalizeCountry(raw?: string): string | undefined {
    const value = (raw ?? "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(value)) return undefined;
    return value;
  }

  private normalizeRegion(raw?: string): string | undefined {
    const value = (raw ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");
    if (!value || value.length > 10) return undefined;
    return value;
  }
}
