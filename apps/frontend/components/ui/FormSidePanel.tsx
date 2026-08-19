"use client";

import React, { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { hideCrispChatLauncher, showCrispChatLauncher } from "@/lib/crisp-client";

const TRANSITION_MS = 300;

function cn(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Panneau latéral pour création à la volée (ex. Nouveau client depuis un picker).
 */
export function FormSidePanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  titleId: titleIdProp,
  widthClassName = "max-w-lg",
  closeDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  titleId?: string;
  widthClassName?: string;
  closeDisabled?: boolean;
}) {
  const autoTitleId = useId();
  const titleId = titleIdProp ?? autoTitleId;
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) {
        setEntered(true);
        return;
      }
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true));
      });
      return () => window.cancelAnimationFrame(id);
    }

    setEntered(false);
    const t = window.setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Le bubble Crisp (z-index très élevé) recouvre sinon le bouton de validation.
    hideCrispChatLauncher();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      showCrispChatLauncher();
    };
  }, [mounted, closeDisabled, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const requestClose = () => {
    if (closeDisabled) return;
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[210]"
      role="presentation"
      // Les événements React remontent l’arbre de composants (même via portal) :
      // empêcher le submit du panneau de valider le formulaire parent.
      onSubmit={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-slate-950/40 transition-opacity duration-300",
          entered ? "opacity-100" : "opacity-0",
        )}
        aria-label="Fermer le panneau"
        disabled={closeDisabled}
        onClick={requestClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-slate-700 dark:bg-slate-900",
          widthClassName,
          entered ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {description ? (
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={closeDisabled}
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50"
            aria-label="Fermer"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          {children}
        </div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40 sm:px-6">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
