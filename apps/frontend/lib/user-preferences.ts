import type { SidebarPreference, ThemePreference, UserPreferences } from "@syncora/shared";
import { writeSidebarCollapsed } from "@/lib/sidebar-preference";

export const USER_PREFERENCES_APPLIED = "syncora:user-preferences-applied";
export const USER_THEME_PREFERENCE_CHANGED = "syncora:user-theme-preference-changed";
export const USER_SIDEBAR_PREFERENCE_CHANGED = "syncora:user-sidebar-preference-changed";

/** Applique thème + sidebar (localStorage + événement pour AppShell / page compte). */
export function applyUserPreferences(
  preferences: UserPreferences,
  setTheme: (theme: string) => void,
): void {
  setTheme(preferences.theme);
  writeSidebarCollapsed(preferences.sidebarCollapsed === "collapsed");
  dispatchPreferencesChanged(preferences);
}

/** Notifie les écrans en lecture seule (ex. page compte) après changement de thème via la barre. */
export function notifyThemePreferenceChanged(theme: ThemePreference): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(USER_THEME_PREFERENCE_CHANGED, { detail: theme }));
}

/** Notifie la page compte après réduction / agrandissement du menu latéral. */
export function notifySidebarPreferenceChanged(sidebarCollapsed: SidebarPreference): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(USER_SIDEBAR_PREFERENCE_CHANGED, { detail: sidebarCollapsed }),
  );
}

function dispatchPreferencesChanged(preferences: UserPreferences): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(USER_PREFERENCES_APPLIED, { detail: preferences }));
}
