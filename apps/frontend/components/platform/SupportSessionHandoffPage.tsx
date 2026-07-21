"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import * as authApi from "@/lib/auth.api";
import { clearSupportSessionHash, readSupportSessionTokenFromHash } from "@/lib/support-session";

/**
 * Point d’entrée app après impersonation depuis le backoffice.
 * Lit le JWT dans le hash, l’écrit dans le localStorage de l’origine app, puis redirige.
 */
export function SupportSessionHandoffPage() {
  const router = useRouter();
  const { enterImpersonationSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = readSupportSessionTokenFromHash();
    clearSupportSessionHash();

    if (!token) {
      router.replace("/login");
      return;
    }

    authApi.setToken(token);
    authApi
      .getMe()
      .then((user) => {
        if (!user.impersonatorId) {
          authApi.clearToken();
          setError("Session support invalide.");
          return;
        }
        enterImpersonationSession(token, user);
        router.replace("/");
      })
      .catch(() => {
        authApi.clearToken();
        setError("Impossible d’ouvrir la session support.");
      });
  }, [enterImpersonationSession, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          className="text-sm text-brand-600 underline"
          onClick={() => router.replace("/login")}
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
      Ouverture de la session support…
    </div>
  );
}
