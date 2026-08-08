import { resolveQuickActionsForOrganization, type UserPreferences } from "@planwise/shared";
import type { UserPreferencesDocument } from "../../persistence/user-preferences.schema";

export function toUserPreferences(
  doc: UserPreferencesDocument,
  organizationId?: string,
): UserPreferences {
  const quickActions = resolveQuickActionsForOrganization({
    organizationId,
    quickActionsByOrganizationId: doc.quickActionsByOrganizationId,
    quickActions: doc.quickActions,
    quickActionIds: doc.quickActionIds,
  });
  const onboardingOrgIds = Array.isArray(doc.onboardingCompletedOrganizationIds)
    ? [...new Set(doc.onboardingCompletedOrganizationIds.filter(Boolean))]
    : [];
  const setupGuideOrgIds = Array.isArray(doc.setupGuideDismissedOrganizationIds)
    ? [...new Set(doc.setupGuideDismissedOrganizationIds.filter(Boolean))]
    : [];
  return {
    theme: doc.theme,
    sidebarCollapsed: doc.sidebarCollapsed,
    quickActions,
    onboardingCompletedOrganizationIds: onboardingOrgIds,
    onboardingProfileCompleted: false,
    setupGuideDismissedOrganizationIds: setupGuideOrgIds,
    setupGuideDismissed: false,
  };
}

export function withOrgScopedPreferences(
  preferences: UserPreferences,
  organizationId?: string,
): UserPreferences {
  const orgId = organizationId?.trim();
  if (!orgId) {
    return {
      ...preferences,
      onboardingProfileCompleted: preferences.onboardingCompletedOrganizationIds.length > 0,
      setupGuideDismissed: preferences.setupGuideDismissedOrganizationIds.length > 0,
    };
  }
  return {
    ...preferences,
    onboardingProfileCompleted: preferences.onboardingCompletedOrganizationIds.includes(orgId),
    setupGuideDismissed: preferences.setupGuideDismissedOrganizationIds.includes(orgId),
  };
}
