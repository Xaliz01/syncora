import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { randomUUID } from "crypto";
import type { UserDocument } from "../persistence/user.schema";
import type { UserSessionDocument } from "../persistence/user-session.schema";
import { activeDocumentFilter, type UserSessionResponse } from "@planwise/shared";
import { AbstractUserSessionsService } from "./ports/user-sessions.service.port";
import { deriveSessionDeviceClass, deriveSessionLabel } from "./session-label";
import { toUserSessionResponse } from "./mappers/user-session.mapper";

const SESSION_LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;
const MAX_USER_AGENT_LENGTH = 400;

@Injectable()
export class UserSessionsService extends AbstractUserSessionsService {
  constructor(
    @InjectModel("User") private readonly userModel: Model<UserDocument>,
    @InjectModel("UserSession") private readonly sessionModel: Model<UserSessionDocument>,
  ) {
    super();
  }

  async createSession(
    userId: string,
    options?: { userAgent?: string },
  ): Promise<{ sessionId: string }> {
    const doc = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!doc) throw new NotFoundException("User not found");

    const now = new Date();
    const sessionId = randomUUID();
    const rawUa = options?.userAgent?.trim() ?? "";
    const userAgent = rawUa ? rawUa.slice(0, MAX_USER_AGENT_LENGTH) : undefined;
    const deviceClass = deriveSessionDeviceClass(userAgent);

    await this.sessionModel.deleteMany({ userId, deviceClass }).exec();

    const legacy = await this.sessionModel
      .find({ userId, deviceClass: { $exists: false } })
      .select("_id userAgent")
      .exec();
    const legacyIds = legacy
      .filter((s) => deriveSessionDeviceClass(s.userAgent) === deviceClass)
      .map((s) => s._id);
    if (legacyIds.length > 0) {
      await this.sessionModel.deleteMany({ _id: { $in: legacyIds } }).exec();
    }

    await this.sessionModel.create({
      userId,
      sessionId,
      deviceClass,
      label: deriveSessionLabel(userAgent),
      userAgent,
      createdAt: now,
      lastSeenAt: now,
    });

    await this.userModel
      .updateOne({ _id: userId }, { $set: { lastLoginAt: now }, $unset: { activeSessionId: "" } })
      .exec()
      .catch(() => undefined);

    return { sessionId };
  }

  async validateSession(userId: string, sessionId: string): Promise<{ valid: boolean }> {
    if (!sessionId?.trim()) {
      return { valid: false };
    }
    const session = await this.sessionModel.findOne({ userId, sessionId: sessionId.trim() }).exec();
    if (!session) return { valid: false };

    const now = Date.now();
    if (now - session.lastSeenAt.getTime() >= SESSION_LAST_SEEN_THROTTLE_MS) {
      session.lastSeenAt = new Date(now);
      await session.save().catch(() => undefined);
    }

    await this.userModel
      .updateOne(
        { _id: userId, lastLoginAt: null },
        { $set: { lastLoginAt: session.createdAt ?? new Date(now) } },
      )
      .exec()
      .catch(() => undefined);

    return { valid: true };
  }

  async revokeSession(userId: string, sessionId?: string): Promise<void> {
    const user = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!user) throw new NotFoundException("User not found");

    if (sessionId?.trim()) {
      await this.sessionModel.deleteOne({ userId, sessionId: sessionId.trim() }).exec();
      return;
    }
    await this.sessionModel.deleteMany({ userId }).exec();
    await this.userModel
      .updateOne({ _id: userId }, { $unset: { activeSessionId: "" } })
      .exec()
      .catch(() => undefined);
  }

  async revokeOtherSessions(userId: string, keepSessionId: string): Promise<void> {
    const user = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!user) throw new NotFoundException("User not found");
    const keep = keepSessionId.trim();
    if (!keep) {
      throw new BadRequestException("sessionId courant requis");
    }
    await this.sessionModel.deleteMany({ userId, sessionId: { $ne: keep } }).exec();
  }

  async listSessions(userId: string, currentSessionId?: string): Promise<UserSessionResponse[]> {
    const user = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!user) throw new NotFoundException("User not found");

    const docs = await this.sessionModel.find({ userId }).sort({ lastSeenAt: -1 }).exec();
    const current = currentSessionId?.trim() ?? "";
    return docs.map((doc) => toUserSessionResponse(doc, current));
  }

  async getLatestLastSeenByUserIds(userIds: string[]): Promise<Record<string, string>> {
    const ids = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) return {};

    const rows = await this.sessionModel
      .aggregate<{
        _id: string;
        lastSeenAt: Date;
      }>([{ $match: { userId: { $in: ids } } }, { $group: { _id: "$userId", lastSeenAt: { $max: "$lastSeenAt" } } }])
      .exec();

    const out: Record<string, string> = {};
    for (const row of rows) {
      if (row._id && row.lastSeenAt) {
        out[row._id] = new Date(row.lastSeenAt).toISOString();
      }
    }
    return out;
  }

  async listUserIdsActiveSince(
    since: Date,
    options?: { limit?: number; offset?: number; userIds?: string[] },
  ): Promise<{ userIds: string[]; total: number }> {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
    const offset = Math.max(options?.offset ?? 0, 0);
    const match: Record<string, unknown> = { lastSeenAt: { $gte: since } };
    const scoped = options?.userIds?.map((id) => id.trim()).filter(Boolean);
    if (scoped && scoped.length > 0) {
      match.userId = { $in: [...new Set(scoped)] };
    } else if (scoped && scoped.length === 0) {
      return { userIds: [], total: 0 };
    }

    const grouped = await this.sessionModel
      .aggregate<{
        _id: string;
        lastSeenAt: Date;
      }>([{ $match: match }, { $group: { _id: "$userId", lastSeenAt: { $max: "$lastSeenAt" } } }, { $sort: { lastSeenAt: -1 } }])
      .exec();

    const total = grouped.length;
    const userIds = grouped.slice(offset, offset + limit).map((r) => r._id);
    return { userIds, total };
  }
}
