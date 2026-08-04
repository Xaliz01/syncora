"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  /** Shown when nothing is selected */
  emptyLabel?: string;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  emptyLabel = "Tous",
  placeholder = "Rechercher…",
  "aria-label": ariaLabel,
  className = "",
  disabled = false,
}: SearchableSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLabel = useMemo(() => {
    if (!value) return emptyLabel;
    return options.find((o) => o.value === value)?.label ?? emptyLabel;
  }, [value, options, emptyLabel]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const select = (next: string) => {
    onChange(next);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={rootRef} className={`relative min-w-[10rem] ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          setSearch("");
        }}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50"
      >
        <span className={value ? "truncate" : "truncate text-slate-400 dark:text-slate-500"}>
          {selectedLabel}
        </span>
        <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && !disabled ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-40 mt-1 w-full min-w-[14rem] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 p-1.5">
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              aria-label={ariaLabel ? `Rechercher — ${ariaLabel}` : "Rechercher"}
              className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => select("")}
              className={`flex w-full px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${
                !value
                  ? "font-medium text-brand-700 dark:text-brand-300"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {emptyLabel}
            </button>
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={value === o.value}
                onClick={() => select(o.value)}
                className={`flex w-full px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${
                  value === o.value
                    ? "font-medium text-brand-700 dark:text-brand-300"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                <span className="truncate">{o.label}</span>
              </button>
            ))}
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-slate-500 dark:text-slate-400">
                Aucun résultat.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
