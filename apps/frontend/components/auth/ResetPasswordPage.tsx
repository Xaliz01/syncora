"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isPasswordPolicyValid, PASSWORD_POLICY_HINT } from "@planwise/shared";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LANDING_TAGLINE } from "@/lib/landing-copy";
import * as authApi from "@/lib/auth.api";

export function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromQuery = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const passwordOk = isPasswordPolicyValid(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = tokenFromQuery.length > 0 && passwordOk && passwordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ token: tokenFromQuery, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réinitialisation impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"
        >
          Planwise
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            {LANDING_TAGLINE}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Nouveau mot de passe
          </h1>

          {!tokenFromQuery ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Ce lien est incomplet ou invalide. Demandez un nouveau lien depuis la page mot de
                passe oublié.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
              >
                Mot de passe oublié
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-4">
              <div
                role="status"
                className="rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm text-green-800 dark:text-green-200"
              >
                Votre mot de passe a été mis à jour. Vous pouvez vous connecter.
              </div>
              <button
                type="button"
                onClick={() => router.push("/login?open=1")}
                className="w-full rounded-lg bg-brand-600 py-3.5 text-base font-medium text-white hover:bg-brand-500"
              >
                Se connecter
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Choisissez un nouveau mot de passe pour votre compte. Les sessions ouvertes seront
                déconnectées.
              </p>
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
                >
                  {error}
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
                >
                  Nouveau mot de passe
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-3 text-base text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {PASSWORD_POLICY_HINT}
                </p>
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
                >
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-3 text-base text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {confirmPassword && !passwordsMatch ? (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    Les mots de passe ne correspondent pas
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-lg bg-brand-600 py-3.5 text-base font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
              >
                {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
