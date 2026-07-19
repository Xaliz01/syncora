"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { SiretLookupResult } from "@planwise/shared";
import * as organizationsApi from "@/lib/organizations.api";

function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export interface SiretLookupFieldProps {
  value: string;
  onChange: (siret: string) => void;
  onSelect?: (result: SiretLookupResult) => void;
  disabled?: boolean;
  readOnly?: boolean;
  label?: string;
  labelCls?: string;
  inputCls?: string;
}

export function SiretLookupField({
  value,
  onChange,
  onSelect,
  disabled = false,
  readOnly = false,
  label = "SIRET",
  labelCls,
  inputCls,
}: SiretLookupFieldProps) {
  const uid = useId();
  const baseId = uid.replace(/:/g, "");
  const listId = `${baseId}-siret-list`;

  const defaultLabelCls =
    labelCls ?? "block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1";
  const defaultInputCls =
    inputCls ??
    "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  const [searchText, setSearchText] = useState(value);
  const debouncedSearch = useDebouncedValue(searchText, 400);
  const [suggestions, setSuggestions] = useState<SiretLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchText(value);
  }, [value]);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void organizationsApi.lookupSiret(q).then((res) => {
      if (!cancelled) {
        setSuggestions(res.results);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setListOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleSelect = (result: SiretLookupResult) => {
    onChange(result.siret);
    setSearchText(result.siret);
    setSuggestions([]);
    setListOpen(false);
    onSelect?.(result);
  };

  if (readOnly) {
    return (
      <div>
        <label className={defaultLabelCls}>{label}</label>
        <p className="mt-1 text-sm text-slate-800 dark:text-slate-100 font-mono">{value || "—"}</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={`${baseId}-siret`} className={defaultLabelCls}>
        {label}
      </label>
      <input
        id={`${baseId}-siret`}
        type="text"
        inputMode="numeric"
        role="combobox"
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Rechercher par SIRET, SIREN ou nom…"
        value={searchText}
        disabled={disabled}
        onChange={(e) => {
          setSearchText(e.target.value);
          onChange(e.target.value);
          setListOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setListOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setListOpen(false);
        }}
        className={defaultInputCls}
        aria-controls={listId}
        aria-expanded={listOpen && suggestions.length > 0}
      />
      {loading && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Recherche dans le répertoire SIRENE…
        </p>
      )}
      {listOpen && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-lg py-1 text-sm"
        >
          {suggestions.map((r) => (
            <li key={r.siret} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(r)}
              >
                <span className="block font-medium text-slate-900 dark:text-slate-100 truncate">
                  {r.nom}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 font-mono">
                  SIRET {r.siret}
                </span>
                {r.city && (
                  <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">
                    {[r.addressLine1, r.postalCode, r.city].filter(Boolean).join(", ")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
