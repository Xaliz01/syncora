"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LANDING_ACCOMPANIMENT, LANDING_HERO_HOOK } from "@/lib/landing-copy";
import { isCrispEnabled, openCrispChat } from "@/lib/crisp-client";

type Variant = "landing" | "login";

function isCrispRuntimeReady(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.$crisp?.is === "function" && window.$crisp.is("website:available") === true;
}

/**
 * Message d’accompagnement éditeur (évolution, import CRM, chat).
 * Sur les pages publiques, Crisp n’est en général chargé qu’après connexion :
 * bouton chat si le widget est prêt, sinon rappel que le chat est dispo dans l’app.
 */
export function AccompanimentSupportBlock({
  variant = "landing",
  onLoginClick,
}: {
  variant?: Variant;
  /** Ouvre le formulaire de connexion (page login). */
  onLoginClick?: () => void;
}) {
  const [chatReady, setChatReady] = useState(false);
  const banner = variant === "login";

  useEffect(() => {
    if (!isCrispEnabled()) return;
    const sync = () => setChatReady(isCrispRuntimeReady());
    sync();
    const id = window.setInterval(sync, 1500);
    return () => window.clearInterval(id);
  }, []);

  const onOpenChat = useCallback(() => {
    openCrispChat();
  }, []);

  return (
    <aside
      className={
        banner
          ? "h-full rounded-2xl border-2 border-brand-300 dark:border-brand-500/50 bg-white/95 dark:bg-slate-900/95 px-5 py-4 sm:px-6 sm:py-5 shadow-md shadow-brand-600/10 ring-1 ring-brand-100 dark:ring-brand-900/40"
          : "rounded-2xl border-2 border-brand-300 dark:border-brand-500/50 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-lg shadow-brand-600/10 dark:shadow-brand-950/40 ring-1 ring-brand-100 dark:ring-brand-900/40"
      }
      aria-labelledby={banner ? "login-accompaniment-title" : "landing-accompaniment-title"}
    >
      <div className={banner ? "flex flex-col gap-4" : undefined}>
        <div className={banner ? "min-w-0" : undefined}>
          <span
            className={
              banner
                ? "inline-flex items-center rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white mb-2"
                : "inline-flex items-center rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white mb-3"
            }
          >
            Accompagnement
          </span>
          <h2
            id={banner ? "login-accompaniment-title" : "landing-accompaniment-title"}
            className={
              banner
                ? "text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100"
                : "text-xl font-bold text-slate-900 dark:text-white"
            }
          >
            {LANDING_ACCOMPANIMENT.title}
          </h2>
          <p
            className={
              banner
                ? "mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                : "mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
            }
          >
            {LANDING_ACCOMPANIMENT.intro}
          </p>
        </div>

        <ul
          className={
            banner
              ? "mt-1 grid gap-2.5 sm:grid-cols-2 auto-rows-fr"
              : "mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"
          }
        >
          {LANDING_ACCOMPANIMENT.points.map((point) => (
            <li
              key={point.title}
              className={
                banner
                  ? "h-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/50 px-3 py-2.5"
                  : "rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/50 px-3.5 py-3"
              }
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {point.title}
              </h3>
              <p
                className={
                  banner
                    ? "mt-0.5 text-xs text-slate-600 dark:text-slate-400 leading-snug"
                    : "mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                }
              >
                {point.description}
              </p>
            </li>
          ))}
        </ul>

        {banner ? (
          chatReady ? (
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex self-start rounded-lg border border-brand-200 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-950/40 px-3.5 py-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-950/70 transition"
            >
              Ouvrir le chat
            </button>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Chat disponible dans l’app une fois connecté.
            </span>
          )
        ) : null}

        {banner ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {LANDING_HERO_HOOK}
            </p>
            <Link
              href="/register"
              className="mt-5 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 transition hover:bg-brand-500"
            >
              Créer un compte
            </Link>
            {onLoginClick ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Déjà un compte ?{" "}
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Se connecter
                </button>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {!banner ? (
        <div className="mt-5">
          {chatReady ? (
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex w-full sm:w-auto justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 transition shadow-sm"
            >
              Ouvrir le chat
            </button>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Le chat est disponible dans l’application une fois connecté.
            </p>
          )}
        </div>
      ) : null}
    </aside>
  );
}
