"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PASSWORD_POLICY_HINT, isPasswordPolicyValid } from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { postAuthHomePath } from "@/lib/subscription-access";
import { LegalConsentCheckbox } from "@/components/legal/LegalConsentCheckbox";
import * as authApi from "@/lib/auth.api";

export function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { acceptInvitation } = useAuth();

  const tokenFromQuery = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const hasTokenFromLink = tokenFromQuery.length > 0;
  const [invitationToken, setInvitationToken] = useState(tokenFromQuery);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalConsent, setLegalConsent] = useState(false);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(hasTokenFromLink);

  useEffect(() => {
    const token = invitationToken.trim();
    if (!token) {
      setPreviewLoading(false);
      setRequiresPasswordSetup(true);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    void authApi
      .resolveInvitation(token)
      .then((preview) => {
        if (cancelled) return;
        setRequiresPasswordSetup(preview.requiresPasswordSetup);
        if (preview.invitedName) setName(preview.invitedName);
      })
      .catch(() => {
        if (cancelled) return;
        setRequiresPasswordSetup(true);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [invitationToken]);

  const passwordOk = requiresPasswordSetup
    ? isPasswordPolicyValid(password)
    : password.trim().length > 0;

  const canSubmit =
    invitationToken.trim().length > 0 && passwordOk && legalConsent && !previewLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const user = await acceptInvitation({
        invitationToken: invitationToken.trim(),
        password,
        name: name.trim() || undefined,
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
            P
          </span>
          <div>
            <div className="font-semibold text-lg text-slate-900 dark:text-slate-100">Planwise</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Activation de votre invitation
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Rejoindre l&apos;organisation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            {hasTokenFromLink
              ? requiresPasswordSetup
                ? "Votre lien d'invitation est valide. Définissez votre mot de passe pour activer le compte."
                : "Votre lien d'invitation est valide. Confirmez votre mot de passe pour rejoindre cette organisation."
              : "Ouvrez le lien reçu par e-mail, ou collez le jeton d'invitation si vous l'avez sous la main."}
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
            {hasTokenFromLink ? (
              <input type="hidden" name="invitationToken" value={invitationToken} readOnly />
            ) : (
              <div>
                <label
                  htmlFor="invitationToken"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Jeton d&apos;invitation
                </label>
                <input
                  id="invitationToken"
                  type="text"
                  value={invitationToken}
                  onChange={(e) => setInvitationToken(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Collez le jeton reçu"
                />
              </div>
            )}
            {requiresPasswordSetup && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
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
            )}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
              >
                {requiresPasswordSetup ? "Mot de passe" : "Mot de passe du compte"}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={requiresPasswordSetup ? 8 : 1}
                autoComplete={requiresPasswordSetup ? "new-password" : "current-password"}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="••••••••"
              />
              {requiresPasswordSetup ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {PASSWORD_POLICY_HINT}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Ce compte existe déjà. Saisissez le mot de passe actuel pour rejoindre
                  l&apos;organisation.
                </p>
              )}
            </div>
            <LegalConsentCheckbox
              id="invitation-legal-consent"
              checked={legalConsent}
              onChange={setLegalConsent}
            />
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 transition"
            >
              {loading
                ? "Activation…"
                : requiresPasswordSetup
                  ? "Activer mon compte"
                  : "Rejoindre l'organisation"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
