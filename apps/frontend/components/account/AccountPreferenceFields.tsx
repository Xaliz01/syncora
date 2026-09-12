"use client";

import type { SidebarPreference, ThemePreference } from "@planwise/shared";

const THEME_LABELS: Record<ThemePreference, string> = {
  light: "Clair",
  dark: "Sombre",
};

const SIDEBAR_LABELS: Record<SidebarPreference, string> = {
  expanded: "Déplié",
  collapsed: "Plié",
};

function preferenceOptionClassName(selected: boolean, readOnly: boolean): string {
  const base = "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition";
  if (selected) {
    return `${base} border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 ring-1 ring-brand-500`;
  }
  return `${base} border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 ${
    readOnly ? "opacity-60" : "hover:border-slate-300 dark:hover:border-slate-500 cursor-pointer"
  }`;
}

export function ThemeRadioGroup({
  value,
  onChange,
  readOnly = false,
}: {
  value: ThemePreference;
  onChange?: (v: ThemePreference) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Thème
      </span>
      <div className="flex gap-3">
        {(["light", "dark"] as const).map((theme) => {
          const selected = value === theme;
          const content = (
            <>
              {theme === "light" ? (
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
              {THEME_LABELS[theme]}
            </>
          );

          if (readOnly) {
            return (
              <div
                key={theme}
                className={preferenceOptionClassName(selected, true)}
                aria-current={selected ? "true" : undefined}
              >
                {content}
              </div>
            );
          }

          return (
            <label key={theme} className={preferenceOptionClassName(selected, false)}>
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={selected}
                onChange={() => onChange?.(theme)}
                className="sr-only"
              />
              {content}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function SidebarRadioGroup({
  value,
  onChange,
  readOnly = false,
}: {
  value: SidebarPreference;
  onChange?: (v: SidebarPreference) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Menu latéral
      </span>
      <div className="flex gap-3">
        {(["expanded", "collapsed"] as const).map((sidebar) => {
          const selected = value === sidebar;
          const content = (
            <>
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                {sidebar === "expanded" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                )}
              </svg>
              {SIDEBAR_LABELS[sidebar]}
            </>
          );

          if (readOnly) {
            return (
              <div
                key={sidebar}
                className={preferenceOptionClassName(selected, true)}
                aria-current={selected ? "true" : undefined}
              >
                {content}
              </div>
            );
          }

          return (
            <label key={sidebar} className={preferenceOptionClassName(selected, false)}>
              <input
                type="radio"
                name="sidebar"
                value={sidebar}
                checked={selected}
                onChange={() => onChange?.(sidebar)}
                className="sr-only"
              />
              {content}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function VoiceFieldPreferenceToggle({
  value,
  onChange,
  readOnly = false,
}: {
  value: boolean;
  onChange?: (v: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        Commandes vocales (Ma journée) — expérimental
      </span>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Disponibles sur mobile. Sur Ma journée, dites « Planwise » ou « Plan », ou utilisez le
        micro. Fonctionnalité expérimentale : le comportement peut encore évoluer.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label="Commandes vocales"
          disabled={readOnly}
          onClick={() => {
            if (!readOnly) onChange?.(!value);
          }}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            value ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-600"
          } ${readOnly ? "cursor-default opacity-70" : "cursor-pointer"}`}
        >
          <span
            aria-hidden
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              value ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm text-slate-700 dark:text-slate-200">
          {value ? "Activées" : "Désactivées"}
        </span>
      </div>
    </div>
  );
}
