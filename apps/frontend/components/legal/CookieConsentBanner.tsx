"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  acceptAllCookies,
  COOKIE_CONSENT_CHANGED_EVENT,
  getCookieConsent,
  hasCookieConsentDecision,
  rejectOptionalCookies,
  saveCookieConsent,
} from "@/lib/legal/cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [supportEnabled, setSupportEnabled] = useState(true);

  useEffect(() => {
    setVisible(!hasCookieConsentDecision());
  }, []);

  if (!visible) return null;

  const close = () => setVisible(false);

  const handleAcceptAll = () => {
    acceptAllCookies();
    close();
  };

  const handleRejectOptional = () => {
    rejectOptionalCookies();
    close();
  };

  const handleSavePreferences = () => {
    saveCookieConsent(supportEnabled);
    close();
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5 sm:p-6 space-y-4">
        <div>
          <h2
            id="cookie-consent-title"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Cookies et traceurs
          </h2>
          <p id="cookie-consent-desc" className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Nous utilisons des cookies et stockages locaux strictement nécessaires au fonctionnement
            de Planwise (session, préférences). Avec votre accord, nous activons également le chat
            support (Crisp). Consultez notre{" "}
            <Link
              href="/politique-cookies"
              className="text-brand-600 dark:text-brand-400 underline"
            >
              politique cookies
            </Link>{" "}
            et notre{" "}
            <Link
              href="/politique-confidentialite"
              className="text-brand-600 dark:text-brand-400 underline"
            >
              politique de confidentialité
            </Link>
            .
          </p>
        </div>

        {customizeOpen && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Strictement nécessaires
                </p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Authentification, préférences d&apos;interface, PWA. Toujours actifs.
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                Requis
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <label
                  htmlFor="cookie-support"
                  className="font-medium text-slate-900 dark:text-slate-100"
                >
                  Support client (Crisp)
                </label>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Chat d&apos;assistance et centre d&apos;aide.
                </p>
              </div>
              <input
                id="cookie-support"
                type="checkbox"
                checked={supportEnabled}
                onChange={(e) => setSupportEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:justify-end">
          {!customizeOpen ? (
            <>
              <button
                type="button"
                onClick={() => setCustomizeOpen(true)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Personnaliser
              </button>
              <button
                type="button"
                onClick={handleRejectOptional}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Refuser les optionnels
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
              >
                Tout accepter
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
              >
                Enregistrer mes choix
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Réagit aux changements de consentement (ex. rechargement Crisp). */
export function useCookieConsentSupport(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(getCookieConsent()?.support === true);
    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
  }, []);

  return allowed;
}
