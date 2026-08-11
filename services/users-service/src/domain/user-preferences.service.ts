import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { UserDocument } from "../persistence/user.schema";
import type { UserPreferencesDocument } from "../persistence/user-preferences.schema";
import {
  activeDocumentFilter,
  DEFAULT_USER_PREFERENCES,
  normalizeQuickActions,
  type UpdateUserPreferencesBody,
  type UserPreferencesResponse,
} from "@planwise/shared";
import { AbstractUserPreferencesService } from "./ports/user-preferences.service.port";
import { toUserPreferences, withOrgScopedPreferences } from "./mappers/user-preferences.mapper";

@Injectable()
export class UserPreferencesService extends AbstractUserPreferencesService {
  constructor(
    @InjectModel("User") private readonly userModel: Model<UserDocument>,
    @InjectModel("UserPreferences")
    private readonly preferencesModel: Model<UserPreferencesDocument>,
  ) {
    super();
  }

  async getPreferences(userId: string, organizationId?: string): Promise<UserPreferencesResponse> {
    const doc = await this.preferencesModel.findOne({ userId }).exec();
    if (!doc) {
      return {
        userId,
        preferences: withOrgScopedPreferences({ ...DEFAULT_USER_PREFERENCES }, organizationId),
      };
    }
    return {
      userId: doc.userId,
      preferences: withOrgScopedPreferences(toUserPreferences(doc, organizationId), organizationId),
    };
  }

  async updatePreferences(
    userId: string,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse> {
    const user = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!user) throw new NotFoundException("User not found");

    const orgId = body.organizationId?.trim();
    if (body.onboardingProfileCompleted !== undefined && !orgId) {
      throw new BadRequestException(
        "organizationId is required when updating onboardingProfileCompleted",
      );
    }
    if (body.setupGuideDismissed !== undefined && !orgId) {
      throw new BadRequestException("organizationId is required when updating setupGuideDismissed");
    }
    if (body.quickActions !== undefined && !orgId) {
      throw new BadRequestException("organizationId is required when updating quickActions");
    }

    const $set: Record<string, unknown> = {};
    if (body.theme !== undefined) $set.theme = body.theme;
    if (body.sidebarCollapsed !== undefined) $set.sidebarCollapsed = body.sidebarCollapsed;
    if (body.voiceFieldEnabled !== undefined) $set.voiceFieldEnabled = body.voiceFieldEnabled;
    if (body.quickActions !== undefined && orgId) {
      const normalized = normalizeQuickActions(body.quickActions);
      if (!normalized) {
        throw new BadRequestException(
          `quickActions must be an array of { id?, href, label } bookmarks (max 50)`,
        );
      }
      $set[`quickActionsByOrganizationId.${orgId}`] = normalized;
    }

    const $setOnInsert: Record<string, unknown> = {
      userId,
      ...(body.theme === undefined ? { theme: DEFAULT_USER_PREFERENCES.theme } : {}),
      ...(body.sidebarCollapsed === undefined
        ? { sidebarCollapsed: DEFAULT_USER_PREFERENCES.sidebarCollapsed }
        : {}),
      ...(body.voiceFieldEnabled === undefined
        ? { voiceFieldEnabled: DEFAULT_USER_PREFERENCES.voiceFieldEnabled }
        : {}),
      ...(body.quickActions === undefined
        ? { quickActions: DEFAULT_USER_PREFERENCES.quickActions.map((b) => ({ ...b })) }
        : {}),
      ...(body.quickActions === undefined ? { quickActionsByOrganizationId: {} } : {}),
    };

    const update: Record<string, unknown> = {
      $setOnInsert,
    };
    if (Object.keys($set).length > 0) {
      update.$set = $set;
    }

    const $addToSet: Record<string, string> = {};
    const $pull: Record<string, string> = {};

    if (body.onboardingProfileCompleted === true && orgId) {
      $addToSet.onboardingCompletedOrganizationIds = orgId;
    } else if (body.onboardingProfileCompleted === false && orgId) {
      $pull.onboardingCompletedOrganizationIds = orgId;
    }

    if (body.setupGuideDismissed === true && orgId) {
      $addToSet.setupGuideDismissedOrganizationIds = orgId;
    } else if (body.setupGuideDismissed === false && orgId) {
      $pull.setupGuideDismissedOrganizationIds = orgId;
    }

    if (Object.keys($addToSet).length > 0) {
      update.$addToSet = $addToSet;
    }
    if (Object.keys($pull).length > 0) {
      update.$pull = $pull;
    }

    if (
      !$addToSet.onboardingCompletedOrganizationIds &&
      !$pull.onboardingCompletedOrganizationIds
    ) {
      $setOnInsert.onboardingCompletedOrganizationIds = [];
    }
    if (
      !$addToSet.setupGuideDismissedOrganizationIds &&
      !$pull.setupGuideDismissedOrganizationIds
    ) {
      $setOnInsert.setupGuideDismissedOrganizationIds = [];
    }

    const doc = await this.preferencesModel
      .findOneAndUpdate({ userId }, update, { upsert: true, new: true })
      .exec();

    return {
      userId: doc!.userId,
      preferences: withOrgScopedPreferences(toUserPreferences(doc!, orgId), orgId),
    };
  }
}
