"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import * as accountApi from "@/lib/account.api";
import type { ThemePreference, SidebarPreference } from "@syncora/shared";
import { useTheme } from "next-themes";
import { readSidebarCollapsed, writeSidebarCollapsed } from "@/lib/sidebar-preference";

export function AccountPage() {
  const { user, refreshSession } = useAuth();
  const { showToast } = useToast();
  const { setTheme, resolvedTheme } = useTheme();

  const [name, setName] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [themePreference, setThemePreference] = useState<ThemePreference>(
    (resolvedTheme as ThemePreference) ?? "light",
  );
  const [sidebarPreference, setSidebarPreference] = useState<SidebarPreference>(
    readSidebarCollapsed() ? "collapsed" : "expanded",
  );
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    accountApi
      .getPreferences()
      .then((res) => {
        setThemePreference(res.preferences.theme);
        setSidebarPreference(res.preferences.sidebarCollapsed);
        setPrefsLoaded(true);
      })
      .catch(() => {
        setPrefsLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const handleNameSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      setNameSaving(true);
      try {
        await accountApi.updateName({ name: name.trim() });
        await refreshSession();
        showToast("Nom mis à jour");
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setNameSaving(false);
      }
    },
    [name, refreshSession, showToast],
  );

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentPassword || !newPassword) return;
      if (newPassword !== confirmPassword) {
        showToast("Les mots de passe ne correspondent pas", "error");
        return;
      }
      if (newPassword.length < 6) {
        showToast("Le mot de passe doit contenir au moins 6 caractères", "error");
        return;
      }
      setPasswordSaving(true);
      try {
        await accountApi.changePassword({ currentPassword, newPassword });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        showToast("Mot de passe mis à jour");
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setPasswordSaving(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, showToast],
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
        setTheme(res.preferences.theme);
        writeSidebarCollapsed(res.preferences.sidebarCollapsed === "collapsed");
        showToast("Préférences mises à jour");
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setPrefsSaving(false);
      }
    },
    [themePreference, sidebarPreference, setTheme, showToast],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mon compte</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gérez vos informations personnelles et vos préférences.
        </p>
      </div>

      {/* Informations du compte (lecture seule) */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Informations du compte
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Adresse e-mail
            </label>
            <p className="text-sm text-slate-900 dark:text-slate-100">{user?.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Rôle
            </label>
            <span className="inline-block rounded-full bg-brand-600/10 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
              {user?.role === "admin" ? "Administrateur" : "Membre"}
            </span>
          </div>
        </div>
      </section>

      {/* Modifier le nom */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Modifier le nom
        </h2>
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
              className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              placeholder="Votre nom"
            />
          </div>
          <button
            type="submit"
            disabled={nameSaving || !name.trim() || name.trim() === (user?.name ?? "")}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {nameSaving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </section>

      {/* Changer le mot de passe */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Changer le mot de passe
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="current-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Mot de passe actuel
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {passwordSaving ? "Modification…" : "Modifier le mot de passe"}
          </button>
        </form>
      </section>

      {/* Préférences utilisateur */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Préférences</h2>
        {!prefsLoaded ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
        ) : (
          <form onSubmit={handlePrefsSubmit} className="space-y-6">
            <div>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Thème
              </span>
              <div className="flex gap-3">
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition ${
                    themePreference === "light"
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 ring-1 ring-brand-500"
                      : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={themePreference === "light"}
                    onChange={() => setThemePreference("light")}
                    className="sr-only"
                  />
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Clair
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition ${
                    themePreference === "dark"
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 ring-1 ring-brand-500"
                      : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={themePreference === "dark"}
                    onChange={() => setThemePreference("dark")}
                    className="sr-only"
                  />
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                  Sombre
                </label>
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Menu latéral
              </span>
              <div className="flex gap-3">
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition ${
                    sidebarPreference === "expanded"
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 ring-1 ring-brand-500"
                      : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="sidebar"
                    value="expanded"
                    checked={sidebarPreference === "expanded"}
                    onChange={() => setSidebarPreference("expanded")}
                    className="sr-only"
                  />
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                  Déplié
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition ${
                    sidebarPreference === "collapsed"
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 ring-1 ring-brand-500"
                      : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="sidebar"
                    value="collapsed"
                    checked={sidebarPreference === "collapsed"}
                    onChange={() => setSidebarPreference("collapsed")}
                    className="sr-only"
                  />
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  </svg>
                  Plié
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={prefsSaving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {prefsSaving ? "Enregistrement…" : "Enregistrer les préférences"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
