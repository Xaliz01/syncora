"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { postAuthHomePath } from "@/lib/subscription-access";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      router.replace(postAuthHomePath(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold">
              S
            </span>
            <div>
              <div className="font-semibold text-lg">Syncora</div>
              <div className="text-xs text-slate-500">CRM des opérations terrain</div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-6xl grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <h1 className="text-3xl font-semibold mb-2">Bienvenue sur Syncora</h1>
            <p className="text-slate-600 mb-8 max-w-xl">
              Gérez votre portefeuille client, planifiez vos interventions, suivez vos stocks et
              votre flotte au même endroit.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="font-medium mb-1">Portefeuille client</h2>
                <p className="text-sm text-slate-600">
                  Centralisez vos clients, sites et contacts, avec l’historique des interventions.
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="font-medium mb-1">Interventions</h2>
                <p className="text-sm text-slate-600">
                  Planifiez, assignez des intervenants et suivez le cycle de vie complet d’une
                  intervention.
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="font-medium mb-1">Stocks & flotte</h2>
                <p className="text-sm text-slate-600">
                  Pilotez vos stocks, entrepôts et camions avec une vision temps réel.
                </p>
              </article>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold mb-2">Connexion</h2>
            <p className="text-slate-600 mb-8 max-w-xl">
              Accédez à votre espace Syncora avec votre email et mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="vous@exemple.fr"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
              >
                {loading ? "Connexion…" : "Se connecter"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-brand-600 hover:text-brand-500 hover:underline font-medium">
                Créer une organisation
              </Link>
            </p>
            <p className="mt-2 text-center text-sm text-slate-600">
              Reçu une invitation ?{" "}
              <Link href="/accept-invitation" className="text-brand-600 hover:text-brand-500 hover:underline font-medium">
                Activer votre compte invité
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
