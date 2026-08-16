"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BetaBadge } from "@/components/ui/BetaBadge";
import { LANDING_TAGLINE } from "@/lib/landing-copy";
import * as authApi from "@/lib/auth.api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [debugResetToken, setDebugResetToken] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authApi.forgotPassword({ email: email.trim() });
      setSent(true);
      setDebugResetToken(result.debugResetToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demande impossible");
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
          <BetaBadge />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            {LANDING_TAGLINE}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Mot de passe oublié
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
            Indiquez l’e-mail de votre compte. Si un compte existe, vous recevrez un lien pour
            choisir un nouveau mot de passe.
          </p>

          {sent ? (
            <div className="space-y-4">
              <div
                role="status"
                className="rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm text-green-800 dark:text-green-200"
              >
                Si un compte est associé à cette adresse, un e-mail vient de partir. Vérifiez votre
                boîte de réception (et les indésirables). Le lien est valable 1 heure.
              </div>
              {debugResetToken ? (
                <p className="text-xs text-amber-700 dark:text-amber-300 break-all">
                  Debug (hors production) :{" "}
                  <Link
                    href={`/reset-password?token=${encodeURIComponent(debugResetToken)}`}
                    className="underline"
                  >
                    ouvrir le lien de réinitialisation
                  </Link>
                </p>
              ) : null}
              <p className="text-center text-sm">
                <Link
                  href="/login?open=1"
                  className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
                >
                  Retour à la connexion
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-3 text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="vous@exemple.fr"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-lg bg-brand-600 py-3.5 text-base font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
              >
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
              <p className="text-center text-sm text-slate-600 dark:text-slate-300">
                <Link
                  href="/login?open=1"
                  className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
                >
                  Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
