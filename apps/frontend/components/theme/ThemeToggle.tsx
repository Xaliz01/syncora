"use client";

import { useTheme } from "next-themes";
import React, { useCallback, useEffect, useState } from "react";
import type { ThemePreference } from "@syncora/shared";
import { useAuth } from "@/components/auth/AuthContext";
import * as accountApi from "@/lib/account.api";
import { notifyThemePreferenceChanged } from "@/lib/user-preferences";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const { isAuthenticated, isReady } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemePreference = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    if (isReady && isAuthenticated) {
      void accountApi
        .updatePreferences({ theme: next })
        .then(() => notifyThemePreferenceChanged(next))
        .catch(() => {
          /* thème déjà appliqué localement */
        });
    }
  }, [resolvedTheme, setTheme, isReady, isAuthenticated]);

  if (!mounted) {
    return (
      <span
        className="inline-flex h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      title={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
      aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
    >
      {isDark ? (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
