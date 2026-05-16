"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import * as accountApi from "@/lib/account.api";
import type { ThemePreference, SidebarPreference, UserPreferences } from "@syncora/shared";
import { useTheme } from "next-themes";
import { readSidebarCollapsed } from "@/lib/sidebar-preference";
import {
  applyUserPreferences,
  USER_PREFERENCES_APPLIED,
  USER_SIDEBAR_PREFERENCE_CHANGED,
  USER_THEME_PREFERENCE_CHANGED,
} from "@/lib/user-preferences";
import { ChangePasswordDialog } from "@/components/account/ChangePasswordDialog";

const THEME_LABELS: Record<ThemePreference, string> = {
  light: "Clair",
  dark: "Sombre",
};

const SIDEBAR_LABELS: Record<SidebarPreference, string> = {
  expanded: "Déplié",
  collapsed: "Plié",
};

const outlineButtonClassName =
  "rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800";

function SectionEditHeader({
  title,
  isEditing,
  onEdit,
  onCancel,
}: {
  title: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      {isEditing ? (
        <button type="button" onClick={onCancel} className={outlineButtonClassName}>
          Annuler
        </button>
      ) : (
        <button type="button" onClick={onEdit} className={outlineButtonClassName}>
          Modifier
        </button>
      )}
    </div>
  );
}

function preferenceOptionClassName(selected: boolean, readOnly: boolean): string {
  const base = "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition";
  if (selected) {
    return `${base} border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 ring-1 ring-brand-500`;
  }
  return `${base} border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 ${
    readOnly ? "opacity-60" : "hover:border-slate-300 dark:hover:border-slate-500 cursor-pointer"
  }`;
}

function ThemeRadioGroup({
  value,
  onChange,
  readOnly = false,
}: {
  value: ThemePreference;
  onChange?: (v: ThemePreference) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Thème
      </span>
      <div className="flex gap-3">
        {(["light", "dark"] as const).map((theme) => {
          const selected = value === theme;
          const content = (
            <>
              {theme === "light" ? (
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
              {THEME_LABELS[theme]}
            </>
          );

          if (readOnly) {
            return (
              <div
                key={theme}
                className={preferenceOptionClassName(selected, true)}
                aria-current={selected ? "true" : undefined}
              >
                {content}
              </div>
            );
          }

          return (
            <label key={theme} className={preferenceOptionClassName(selected, false)}>
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={selected}
                onChange={() => onChange?.(theme)}
                className="sr-only"
              />
              {content}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SidebarRadioGroup({
  value,
  onChange,
  readOnly = false,
}: {
  value: SidebarPreference;
  onChange?: (v: SidebarPreference) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Menu latéral
      </span>
      <div className="flex gap-3">
        {(["expanded", "collapsed"] as const).map((sidebar) => {
          const selected = value === sidebar;
          const content = (
            <>
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                {sidebar === "expanded" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                )}
              </svg>
              {SIDEBAR_LABELS[sidebar]}
            </>
          );

          if (readOnly) {
            return (
              <div
                key={sidebar}
                className={preferenceOptionClassName(selected, true)}
                aria-current={selected ? "true" : undefined}
              >
                {content}
              </div>
            );
          }

          return (
            <label key={sidebar} className={preferenceOptionClassName(selected, false)}>
              <input
                type="radio"
                name="sidebar"
                value={sidebar}
                checked={selected}
                onChange={() => onChange?.(sidebar)}
                className="sr-only"
              />
              {content}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function AccountPage() {
  const { user, refreshSession } = useAuth();
  const { showToast } = useToast();
  const { setTheme, resolvedTheme } = useTheme();

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);

  const [editingPrefs, setEditingPrefs] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("light");
  const [sidebarPreference, setSidebarPreference] = useState<SidebarPreference>("expanded");
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const syncDisplayPreferencesFromLive = useCallback(() => {
    if (resolvedTheme === "light" || resolvedTheme === "dark") {
      setThemePreference(resolvedTheme);
    }
    setSidebarPreference(readSidebarCollapsed() ? "collapsed" : "expanded");
  }, [resolvedTheme]);

  const loadPreferencesFromServer = useCallback(async () => {
    try {
      const res = await accountApi.getPreferences();
      setThemePreference(res.preferences.theme);
      setSidebarPreference(res.preferences.sidebarCollapsed);
    } catch {
      syncDisplayPreferencesFromLive();
    } finally {
      setPrefsLoaded(true);
    }
  }, [syncDisplayPreferencesFromLive]);

  useEffect(() => {
    void loadPreferencesFromServer();
  }, [loadPreferencesFromServer]);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  useEffect(() => {
    if (editingPrefs) return;
    syncDisplayPreferencesFromLive();
  }, [editingPrefs, syncDisplayPreferencesFromLive]);

  useEffect(() => {
    if (editingPrefs) return;

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
    };

    window.addEventListener(USER_THEME_PREFERENCE_CHANGED, onThemeChanged);
    window.addEventListener(USER_SIDEBAR_PREFERENCE_CHANGED, onSidebarChanged);
    window.addEventListener(USER_PREFERENCES_APPLIED, onPreferencesApplied);
    return () => {
      window.removeEventListener(USER_THEME_PREFERENCE_CHANGED, onThemeChanged);
      window.removeEventListener(USER_SIDEBAR_PREFERENCE_CHANGED, onSidebarChanged);
      window.removeEventListener(USER_PREFERENCES_APPLIED, onPreferencesApplied);
    };
  }, [editingPrefs]);

  const cancelNameEdit = useCallback(() => {
    setName(user?.name ?? "");
    setEditingName(false);
  }, [user?.name]);

  const cancelPrefsEdit = useCallback(() => {
    syncDisplayPreferencesFromLive();
    setEditingPrefs(false);
  }, [syncDisplayPreferencesFromLive]);

  const handleNameSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      setNameSaving(true);
      try {
        await accountApi.updateName({ name: name.trim() });
        await refreshSession();
        setEditingName(false);
        showToast("Nom mis à jour");
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setNameSaving(false);
      }
    },
    [name, refreshSession, showToast],
  );

  const handlePrefsSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPrefsSaving(true);
      try {
        const res = await accountApi.updatePreferences({
          theme: themePreference,
          sidebarCollapsed: sidebarPreference,
        });
        applyUserPreferences(res.preferences, setTheme);
        setThemePreference(res.preferences.theme);
        setSidebarPreference(res.preferences.sidebarCollapsed);
        setEditingPrefs(false);
        showToast("Préférences mises à jour");
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setPrefsSaving(false);
      }
    },
    [themePreference, sidebarPreference, setTheme, showToast],
  );

  const inputClassName =
    "w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition";

  const saveButtonClassName =
    "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mon compte</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gérez vos informations personnelles et vos préférences.
        </p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Adresse e-mail
            </span>
            <p className="text-sm text-slate-900 dark:text-slate-100">{user?.email}</p>
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Rôle
            </span>
            <span className="inline-block rounded-full bg-brand-600/10 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
              {user?.role === "admin" ? "Administrateur" : "Membre"}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <SectionEditHeader
          title="Nom"
          isEditing={editingName}
          onEdit={() => {
            setName(user?.name ?? "");
            setEditingName(true);
          }}
          onCancel={cancelNameEdit}
        />
        {!editingName ? (
          <dl className="text-sm">
            <dt className="text-slate-500 dark:text-slate-400">Nom complet</dt>
            <dd className="mt-1 text-slate-900 dark:text-slate-100">{user?.name?.trim() || "—"}</dd>
          </dl>
        ) : (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="account-name"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Nom complet
              </label>
              <input
                id="account-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClassName}
                placeholder="Votre nom"
              />
            </div>
            <button
              type="submit"
              disabled={nameSaving || !name.trim() || name.trim() === (user?.name ?? "")}
              className={saveButtonClassName}
            >
              {nameSaving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <SectionEditHeader
          title="Préférences"
          isEditing={editingPrefs}
          onEdit={() => {
            syncDisplayPreferencesFromLive();
            setEditingPrefs(true);
          }}
          onCancel={cancelPrefsEdit}
        />
        {!prefsLoaded ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
        ) : !editingPrefs ? (
          <div className="space-y-6">
            <ThemeRadioGroup value={themePreference} readOnly />
            <SidebarRadioGroup value={sidebarPreference} readOnly />
          </div>
        ) : (
          <form onSubmit={handlePrefsSubmit} className="space-y-6">
            <ThemeRadioGroup value={themePreference} onChange={setThemePreference} />
            <SidebarRadioGroup value={sidebarPreference} onChange={setSidebarPreference} />
            <button type="submit" disabled={prefsSaving} className={saveButtonClassName}>
              {prefsSaving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        )}
      </section>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
    </div>
  );
}
