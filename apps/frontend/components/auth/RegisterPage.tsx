"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { postAuthHomePath } from "@/lib/subscription-access";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function RegisterPage() {
  const [organizationName, setOrganizationName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await register({
        organizationName,
        adminEmail,
        adminPassword,
        adminName: adminName.trim() || undefined
      });
      router.replace(postAuthHomePath(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création de compte impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold">
              S
            </span>
            <div>
              <div className="font-semibold text-lg text-slate-900 dark:text-slate-100">Syncora</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">CRM des opérations terrain</div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Créer votre organisation</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-xl">
            Créez votre organisation et un compte administrateur pour commencer à utiliser
            Syncora.
          </p>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20 space-y-4"
          >
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                {error}
              </div>
            )}
            <div>
              <label
                htmlFor="organizationName"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
              >
                Nom de l&apos;organisation
              </label>
              <input
                id="organizationName"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Mon entreprise"
              />
            </div>
            <div>
              <label htmlFor="adminName" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Votre nom (optionnel)
              </label>
              <input
                id="adminName"
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Email administrateur
              </label>
              <input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="admin@exemple.fr"
              />
            </div>
            <div>
              <label
                htmlFor="adminPassword"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
              >
                Mot de passe
              </label>
              <input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Minimum 8 caractères</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 transition"
            >
              {loading ? "Création…" : "Créer l'organisation et mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-brand-600 dark:text-brand-400 hover:text-brand-500 hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
