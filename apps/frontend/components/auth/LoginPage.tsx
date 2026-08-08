"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BASE_SUBSCRIPTION_PLAN } from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { getMarketingHomeHref } from "@/lib/host-routing";
import { postAuthHomePath } from "@/lib/subscription-access";
import { sanitizeAuthReturnPath } from "@/lib/auth-return-url";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BetaBadge } from "@/components/ui/BetaBadge";
import { AccompanimentSupportBlock } from "@/components/landing/AccompanimentSupportBlock";
import {
  LANDING_HERO_HEADING,
  LANDING_HERO_HOOK,
  LANDING_HERO_SUPPORT,
  LANDING_TAGLINE,
} from "@/lib/landing-copy";

const LOGIN_HIGHLIGHTS = [
  {
    label: "Planning interactif jour / semaine / mois",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M3 10h18M8 3v4M16 3v4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Interventions terrain : photos, signature, PDF",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    ),
  },
  {
    label: "Contrats de maintenance automatisés",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M8 7h8M8 12h8M8 17h5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    ),
  },
  {
    label: "Devis et facturation sans double saisie",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M4 7h16M4 12h10M4 17h7"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path d="M16 14l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, isReady, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = sanitizeAuthReturnPath(searchParams.get("next"));

  useEffect(() => {
    if (!isReady || !isAuthenticated || !user) return;
    router.replace(returnPath ?? postAuthHomePath(user));
  }, [isReady, isAuthenticated, user, router, returnPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result === "onboarding") {
        router.replace("/register?step=organization");
        return;
      }
      router.replace(returnPath ?? postAuthHomePath(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={getMarketingHomeHref()} className="flex items-center gap-2">
            <Image
              src="/planwise-logo-512.png"
              alt=""
              width={32}
              height={32}
              className="rounded-lg"
            />
            <div>
              <div className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                Planwise
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{LANDING_TAGLINE}</div>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-4 py-8 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-600/10 via-transparent to-violet-600/5 dark:from-brand-600/20 dark:to-violet-950/30"
          aria-hidden
        />
        <div className="relative w-full max-w-6xl flex flex-col gap-6">
          <AccompanimentSupportBlock variant="login" />

          <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-7 shadow-sm dark:shadow-slate-950/20">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <BetaBadge />
                <span className="inline-flex items-center rounded-full border border-brand-200 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-950/40 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                  {BASE_SUBSCRIPTION_PLAN.trialDays} jours d&apos;essai · sans carte bancaire
                </span>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <Image
                  src="/planwise-logo-512.png"
                  alt=""
                  width={44}
                  height={44}
                  className="rounded-xl shadow-md shadow-brand-600/30"
                />
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    Bienvenue sur Planwise
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{LANDING_TAGLINE}</p>
                </div>
              </div>

              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
                {LANDING_HERO_HEADING}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                {LANDING_HERO_SUPPORT}
              </p>

              <ul className="space-y-2">
                {LOGIN_HIGHLIGHTS.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                      {item.icon}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {LANDING_HERO_HOOK}
              </p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                <Link
                  href={getMarketingHomeHref()}
                  className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Découvrir Planwise
                </Link>
                {" · "}
                sans engagement · résiliable à tout moment
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-8 sm:p-10 shadow-sm dark:shadow-slate-950/20 flex flex-col justify-center">
              <h2 className="text-3xl font-semibold mb-3">Connexion</h2>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed mb-8">
                Accédez à votre espace Planwise avec votre email et mot de passe.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                    {error}
                  </div>
                )}
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
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-3 text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="vous@exemple.fr"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
                  >
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-3 text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-brand-600 py-3.5 text-base font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                >
                  {loading ? "Connexion…" : "Se connecter"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-300">
                Pas encore de compte ?{" "}
                <Link
                  href="/register"
                  className="text-brand-600 dark:text-brand-400 hover:text-brand-500 hover:underline font-medium"
                >
                  Créer un compte
                </Link>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
