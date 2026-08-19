"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import {
  formatNavigationVisitedAt,
  NAVIGATION_HISTORY_CHANGED_EVENT,
  readNavigationHistory,
  type NavigationHistoryEntry,
} from "@/lib/navigation-history";

const DRAWER_TRANSITION_MS = 300;

function HistoryClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function NavigationHistoryButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [entries, setEntries] = useState<NavigationHistoryEntry[]>([]);

  const refresh = useCallback(() => {
    if (!user?.id || !user.organizationId) {
      setEntries([]);
      return;
    }
    setEntries(readNavigationHistory(user.id, user.organizationId));
  }, [user?.id, user?.organizationId]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      refresh();
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
    const t = window.setTimeout(() => setMounted(false), DRAWER_TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [open, refresh]);

  useEffect(() => {
    if (!mounted) return;
    function onChanged(e: Event) {
      const detail = (e as CustomEvent<{ userId?: string; organizationId?: string }>).detail;
      if (
        detail?.userId &&
        detail?.organizationId &&
        (detail.userId !== user?.id || detail.organizationId !== user?.organizationId)
      ) {
        return;
      }
      refresh();
    }
    window.addEventListener(NAVIGATION_HISTORY_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(NAVIGATION_HISTORY_CHANGED_EVENT, onChanged);
  }, [mounted, refresh, user?.id, user?.organizationId]);

  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted]);

  if (!user?.id || !user.organizationId) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title="Historique de navigation"
        aria-label="Historique de navigation"
        aria-expanded={open}
        className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <HistoryClockIcon className="h-5 w-5" />
      </button>

      {typeof document !== "undefined" && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[80]" role="presentation">
              <button
                type="button"
                className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                  entered ? "opacity-100" : "opacity-0"
                }`}
                aria-label="Fermer l’historique"
                onClick={() => setOpen(false)}
              />
              <aside
                role="dialog"
                aria-modal="true"
                aria-label="Historique de navigation"
                className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900 ${
                  entered ? "translate-x-0" : "translate-x-full"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Historique
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Fermer
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {entries.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      Aucune page visitée pour le moment.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {entries.map((entry) => (
                        <li key={`${entry.href}:${entry.visitedAt}`}>
                          <Link
                            href={entry.href}
                            onClick={() => setOpen(false)}
                            className="block px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/80"
                          >
                            <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                              {entry.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                              {formatNavigationVisitedAt(entry.visitedAt)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
