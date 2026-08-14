"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useToast } from "@/components/ui/ToastProvider";
import * as accountApi from "@/lib/account.api";
import { isVoiceFieldDeviceAllowed, isVoiceFieldSpeechSupported } from "@/lib/voice-field";
import { applyUserPreferences } from "@/lib/user-preferences";
import { useTheme } from "next-themes";

const DISMISS_KEY = "planwise:my-day-voice-cta-dismissed";

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

/** Bandeau d’activation des commandes vocales (mobile, préférence désactivée). */
export function MyDayVoiceFieldCta({ viewingToday }: { viewingToday: boolean }) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const { setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [eligibleDevice, setEligibleDevice] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    setEligibleDevice(isVoiceFieldDeviceAllowed() && isVoiceFieldSpeechSupported());
  }, []);

  const { data: accountPrefs, isLoading } = useQuery({
    queryKey: ["account-preferences", user?.id, user?.organizationId],
    queryFn: () => accountApi.getPreferences(),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const enableMutation = useMutation({
    mutationFn: () => accountApi.updatePreferences({ voiceFieldEnabled: true }),
    onSuccess: (res) => {
      applyUserPreferences(res.preferences, setTheme);
      void queryClient.invalidateQueries({ queryKey: ["account-preferences"] });
      showToast("Commandes vocales activées", "success");
    },
    onError: () => {
      showToast("Impossible d’activer les commandes vocales", "error");
    },
  });

  const dismiss = useCallback(() => {
    writeDismissed();
    setDismissed(true);
  }, []);

  if (!viewingToday || !can("interventions.read")) return null;
  if (!eligibleDevice || dismissed || isLoading) return null;
  if (accountPrefs?.preferences.voiceFieldEnabled === true) return null;
  if (!accountPrefs) return null;

  return (
    <aside
      className="mb-6 overflow-hidden rounded-2xl border border-brand-200/80 dark:border-brand-800/60 bg-gradient-to-br from-brand-50 via-white to-slate-50 dark:from-brand-950/50 dark:via-slate-900 dark:to-slate-950 shadow-sm"
      aria-label="Activer les commandes vocales"
    >
      <div className="relative flex gap-4 p-4 sm:p-5">
        <div
          className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-brand-400/10 blur-2xl dark:bg-brand-500/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 left-10 h-24 w-24 rounded-full bg-brand-300/15 blur-2xl dark:bg-brand-600/10"
          aria-hidden
        />

        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <span
            className="absolute inset-0 rounded-2xl bg-brand-600/15 dark:bg-brand-500/20 animate-pulse"
            aria-hidden
          />
          <span
            className="absolute inset-1 rounded-xl border border-brand-400/30 dark:border-brand-400/20"
            aria-hidden
          />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/25">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
          </div>
        </div>

        <div className="relative min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Travaillez les mains libres{" "}
            <span className="font-medium text-slate-500 dark:text-slate-400">(expérimental)</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Dites « Planwise » ou « Plan », puis démarrez, terminez ou commentez une intervention —
            sans toucher l’écran.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => enableMutation.mutate()}
              disabled={enableMutation.isPending}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-60"
            >
              {enableMutation.isPending ? "Activation…" : "Activer les commandes vocales"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Plus tard
            </button>
            <Link
              href="/account"
              className="rounded-lg px-2 py-2 text-xs font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
            >
              Mon compte
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
