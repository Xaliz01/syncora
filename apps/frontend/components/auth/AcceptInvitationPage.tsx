"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { postAuthHomePath } from "@/lib/subscription-access";

export function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { acceptInvitation } = useAuth();

  const tokenFromQuery = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [invitationToken, setInvitationToken] = useState(tokenFromQuery);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await acceptInvitation({
        invitationToken,
        password,
        name: name.trim() || undefined
      });
      router.replace(postAuthHomePath(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acceptation de l'invitation impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold">
            S
          </span>
          <div>
            <div className="font-semibold text-lg text-slate-900 dark:text-slate-100">Syncora</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Activation de votre invitation</div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Rejoindre l&apos;organisation</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            Finalisez votre invitation en définissant votre mot de passe.
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
                htmlFor="invitationToken"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
              >
                Token d&apos;invitation
              </label>
              <input
                id="invitationToken"
                type="text"
                value={invitationToken}
                onChange={(e) => setInvitationToken(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Copiez/collez le token reçu"
              />
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Nom (optionnel)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Votre nom"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 transition"
            >
              {loading ? "Activation…" : "Activer mon compte"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
