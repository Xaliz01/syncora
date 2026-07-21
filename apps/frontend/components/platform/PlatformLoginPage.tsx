"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as platformApi from "@/lib/platform.api";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = platformApi.getStoredPlatformToken();
    if (!token) return;
    platformApi
      .platformMe()
      .then(() => router.replace("/platform"))
      .catch(() => platformApi.clearPlatformToken());
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await platformApi.platformLogin(email, password);
      platformApi.setPlatformToken(result.accessToken);
      router.replace("/platform");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      <header className="flex justify-end px-4 py-3">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Backoffice Planwise
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Accès réservé au staff (@planwise.fr / allowlist).
            </p>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-slate-600 dark:text-slate-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-slate-600 dark:text-slate-300">Mot de passe</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </main>
    </div>
  );
}
