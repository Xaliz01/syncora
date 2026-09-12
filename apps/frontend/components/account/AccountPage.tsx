"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import * as accountApi from "@/lib/account.api";
import type {
  ThemePreference,
  SidebarPreference,
  UserPreferences,
  UserSessionResponse,
} from "@planwise/shared";
import { useTheme } from "next-themes";
import { readSidebarCollapsed } from "@/lib/sidebar-preference";
import {
  USER_PREFERENCES_APPLIED,
  USER_SIDEBAR_PREFERENCE_CHANGED,
  USER_THEME_PREFERENCE_CHANGED,
} from "@/lib/user-preferences";
import { ChangePasswordDialog } from "@/components/account/ChangePasswordDialog";
import {
  SidebarRadioGroup,
  ThemeRadioGroup,
  VoiceFieldPreferenceToggle,
} from "@/components/account/AccountPreferenceFields";
import { LegalLinks } from "@/components/legal/LegalFooter";

const outlineButtonClassName =
  "rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800";

function formatSessionActivity(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function AccountPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { resolvedTheme } = useTheme();

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("light");
  const [sidebarPreference, setSidebarPreference] = useState<SidebarPreference>("expanded");
  const [voiceFieldEnabled, setVoiceFieldEnabled] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const [sessions, setSessions] = useState<UserSessionResponse[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [sessionsBusy, setSessionsBusy] = useState(false);

  const syncDisplayPreferencesFromLive = useCallback(() => {
    if (resolvedTheme === "light" || resolvedTheme === "dark") {
      setThemePreference(resolvedTheme);
    }
    setSidebarPreference(readSidebarCollapsed() ? "collapsed" : "expanded");
  }, [resolvedTheme]);

  useEffect(() => {
    let cancelled = false;
    void accountApi
      .getPreferences()
      .then((res) => {
        if (cancelled) return;
        setThemePreference(res.preferences.theme);
        setSidebarPreference(res.preferences.sidebarCollapsed);
        setVoiceFieldEnabled(res.preferences.voiceFieldEnabled === true);
      })
      .catch(() => {
        if (!cancelled) syncDisplayPreferencesFromLive();
      })
      .finally(() => {
        if (!cancelled) setPrefsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [syncDisplayPreferencesFromLive]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await accountApi.listSessions();
      setSessions(res.sessions);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const onThemeChanged = (event: Event) => {
      const theme = (event as CustomEvent<ThemePreference>).detail;
      if (theme === "light" || theme === "dark") {
        setThemePreference(theme);
      }
    };

    const onSidebarChanged = (event: Event) => {
      const sidebar = (event as CustomEvent<SidebarPreference>).detail;
      if (sidebar === "expanded" || sidebar === "collapsed") {
        setSidebarPreference(sidebar);
      }
    };

    const onPreferencesApplied = (event: Event) => {
      const prefs = (event as CustomEvent<UserPreferences>).detail;
      setThemePreference(prefs.theme);
      setSidebarPreference(prefs.sidebarCollapsed);
      setVoiceFieldEnabled(prefs.voiceFieldEnabled === true);
    };

    window.addEventListener(USER_THEME_PREFERENCE_CHANGED, onThemeChanged);
    window.addEventListener(USER_SIDEBAR_PREFERENCE_CHANGED, onSidebarChanged);
    window.addEventListener(USER_PREFERENCES_APPLIED, onPreferencesApplied);
    return () => {
      window.removeEventListener(USER_THEME_PREFERENCE_CHANGED, onThemeChanged);
      window.removeEventListener(USER_SIDEBAR_PREFERENCE_CHANGED, onSidebarChanged);
      window.removeEventListener(USER_PREFERENCES_APPLIED, onPreferencesApplied);
    };
  }, []);

  const handleRevokeSession = useCallback(
    async (sessionId: string) => {
      setSessionsBusy(true);
      try {
        await accountApi.revokeSession(sessionId);
        showToast("Appareil déconnecté");
        await loadSessions();
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setSessionsBusy(false);
      }
    },
    [loadSessions, showToast],
  );

  const handleRevokeOtherSessions = useCallback(async () => {
    setSessionsBusy(true);
    try {
      await accountApi.revokeOtherSessions();
      showToast("Autres appareils déconnectés");
      await loadSessions();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSessionsBusy(false);
    }
  }, [loadSessions, showToast]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Mon compte
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gérez vos informations personnelles et vos préférences.
          </p>
        </div>
        <Link href="/account/edit" className={outlineButtonClassName}>
          Modifier
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Informations du compte
          </h2>
          <button
            type="button"
            onClick={() => setPasswordDialogOpen(true)}
            className={outlineButtonClassName}
          >
            Modifier mon mot de passe
          </button>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Nom complet
            </dt>
            <dd className="text-slate-900 dark:text-slate-100">{user?.name?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Adresse e-mail
            </dt>
            <dd className="text-slate-900 dark:text-slate-100">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Rôle</dt>
            <dd>
              <span className="inline-block rounded-full bg-brand-600/10 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                {user?.role === "admin" ? "Administrateur" : "Membre"}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Préférences</h2>
        {!prefsLoaded ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
        ) : (
          <div className="space-y-6">
            <ThemeRadioGroup value={themePreference} readOnly />
            <SidebarRadioGroup value={sidebarPreference} readOnly />
            <VoiceFieldPreferenceToggle value={voiceFieldEnabled} readOnly />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Appareils connectés
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Une session bureau et une session mobile peuvent rester connectées en parallèle.
            </p>
          </div>
          {sessions.some((s) => !s.current) ? (
            <button
              type="button"
              onClick={() => void handleRevokeOtherSessions()}
              disabled={sessionsBusy}
              className={outlineButtonClassName}
            >
              Déconnecter les autres appareils
            </button>
          ) : null}
        </div>
        {!sessionsLoaded ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucune session active.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.map((session) => (
              <li
                key={session.sessionId}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {session.label}
                    </p>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {session.deviceClass === "mobile" ? "Mobile" : "Bureau"}
                    </span>
                    {session.current ? (
                      <span className="rounded-full bg-brand-600/10 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                        Cet appareil
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Dernière activité {formatSessionActivity(session.lastSeenAt)}
                  </p>
                </div>
                {!session.current ? (
                  <button
                    type="button"
                    onClick={() => void handleRevokeSession(session.sessionId)}
                    disabled={sessionsBusy}
                    className={outlineButtonClassName}
                  >
                    Révoquer
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          Informations légales
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Consultez nos documents légaux ou contactez-nous pour exercer vos droits sur vos données
          personnelles.
        </p>
        <LegalLinks />
      </section>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
    </div>
  );
}
