"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { PostalAddress } from "@syncora/shared";
import { banFeatureToPostalAddress, searchBanAddresses, type BanFeature } from "@/lib/ban-address";

function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export interface PostalAddressFieldsProps {
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
  onLine1Change: (v: string) => void;
  onLine2Change: (v: string) => void;
  onPostalChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  /** Complément (bâtiment, étage…) */
  showLine2?: boolean;
  showCountry?: boolean;
  compact?: boolean;
  labelCls?: string;
  inputCls?: string;
  legend?: string;
  idPrefix?: string;
  /**
   * Si true (défaut), rue / CP / ville / pays ne sont éditables que via la recherche BAN
   * ou après activation de la saisie manuelle.
   */
  structuredReadOnly?: boolean;
}

export function PostalAddressFields({
  line1,
  line2,
  postalCode,
  city,
  country,
  onLine1Change,
  onLine2Change,
  onPostalChange,
  onCityChange,
  onCountryChange,
  showLine2 = true,
  showCountry = true,
  compact = false,
  labelCls: labelClsProp,
  inputCls: inputClsProp,
  legend,
  idPrefix,
  structuredReadOnly = true,
}: PostalAddressFieldsProps) {
  const uid = useId();
  const baseId = idPrefix ?? uid.replace(/:/g, "");
  const searchId = `${baseId}-ban-search`;
  const listId = `${baseId}-ban-list`;

  const labelCls =
    labelClsProp ??
    (compact
      ? "mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
      : "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200");
  const inputCls =
    inputClsProp ??
    (compact
      ? "w-full rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm bg-white dark:bg-slate-950"
      : "w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950");

  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, 350);
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [banAligned, setBanAligned] = useState(false);
  /** Hors recherche BAN : déverrouille rue / CP / ville / pays */
  const [manualMode, setManualMode] = useState(false);
  const applyingBanRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const locked = structuredReadOnly && !manualMode;
  /**
   * Fond grisé lecture seule — utilitaires `!` pour gagner sur tout `bg-white` passé via inputCls
   * (ordre des classes dans className ne suffit pas avec Tailwind : conflits résolus par la feuille CSS).
   */
  const readonlyFieldCls = locked
    ? "cursor-default !bg-slate-100 dark:!bg-slate-800/90 !border-slate-200 dark:!border-slate-600 text-sm text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:!border-slate-300 dark:focus:!border-slate-600 focus:!ring-slate-300/40 dark:focus:!ring-slate-600/40"
    : "";

  useEffect(() => {
    if (debouncedSearch.trim().length < 3) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    void searchBanAddresses(debouncedSearch.trim(), 8).then((features) => {
      if (!cancelled) {
        setSuggestions(features);
        setSearchLoading(false);
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

  const applySelection = (feature: BanFeature) => {
    applyingBanRef.current = true;
    const a: PostalAddress = banFeatureToPostalAddress(feature);
    onLine1Change(a.line1);
    onPostalChange(a.postalCode);
    onCityChange(a.city);
    onCountryChange(a.country || "FR");
    setBanAligned(true);
    setManualMode(false);
    setSearchText("");
    setSuggestions([]);
    setListOpen(false);
    queueMicrotask(() => {
      applyingBanRef.current = false;
    });
  };

  return (
    <div className="space-y-3">
      {legend && (
        <p
          className={
            compact
              ? "text-xs font-medium text-slate-600 dark:text-slate-300"
              : "text-sm font-medium text-slate-700 dark:text-slate-200"
          }
        >
          {legend}
        </p>
      )}

      <div ref={wrapRef} className="relative">
        <label htmlFor={searchId} className={labelCls}>
          Rechercher une adresse (France)
        </label>
        <input
          id={searchId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Tapez rue, code postal ou ville…"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setListOpen(true);
          }}
          onFocus={() => setListOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setListOpen(false);
          }}
          className={`${inputCls} mt-1`}
          aria-controls={listId}
          aria-expanded={listOpen && suggestions.length > 0}
        />
        {searchLoading && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Recherche dans la Base Adresse Nationale…
          </p>
        )}
        {listOpen && suggestions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-lg py-1 text-sm"
          >
            {suggestions.map((f, i) => {
              const label = f.properties.label ?? "";
              return (
                <li key={`${label}-${i}`} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySelection(f)}
                  >
                    <span className="block truncate">{label}</span>
                    {f.properties.score != null && (
                      <span className="text-[10px] text-slate-400">
                        correspondance {(f.properties.score * 100).toFixed(0)} %
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {structuredReadOnly && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {!manualMode ? (
            <button
              type="button"
              className="text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 underline-offset-2 hover:underline font-medium"
              onClick={() => setManualMode(true)}
            >
              Saisie manuelle (hors répertoire ou correction libre)
            </button>
          ) : (
            <button
              type="button"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline-offset-2 hover:underline"
              onClick={() => setManualMode(false)}
            >
              Verrouiller et privilégier la recherche BAN
            </button>
          )}
        </div>
      )}

      {locked &&
        (line1.trim() || postalCode.trim() || city.trim()) &&
        !banAligned &&
        structuredReadOnly && (
          <p className="text-[11px] text-slate-600 dark:text-slate-400 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-2 py-1.5">
            Pour modifier rue, code postal ou ville : lancez une nouvelle recherche ou activez la
            saisie manuelle.
          </p>
        )}

      {banAligned && !manualMode && structuredReadOnly && (
        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-1.5">
          Rue, code postal, ville et pays sont issus de la Base Adresse Nationale (lecture seule).
          Complétez éventuellement le complément d’adresse ci‑dessous.
        </p>
      )}

      {manualMode && structuredReadOnly && (
        <p className="text-[11px] text-amber-800 dark:text-amber-200 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 px-2 py-1.5">
          Saisie manuelle : vérifiez la cohérence du libellé ; pour une adresse française,
          privilégiez la recherche ci‑dessus.
        </p>
      )}

      <div>
        <label className={labelCls}>Rue et numéro</label>
        <input
          id={`${baseId}-line1`}
          value={line1}
          readOnly={locked}
          onChange={(e) => onLine1Change(e.target.value)}
          placeholder="12 rue de la République"
          title={locked ? "Rempli via la recherche ou saisie manuelle activée" : undefined}
          className={`${inputCls} mt-1 ${readonlyFieldCls}`}
        />
      </div>

      {showLine2 && (
        <div>
          <label className={labelCls}>Complément (optionnel)</label>
          <input
            id={`${baseId}-line2`}
            value={line2}
            onChange={(e) => onLine2Change(e.target.value)}
            placeholder="Bâtiment, étage, BP…"
            className={`${inputCls} mt-1`}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Code postal</label>
          <input
            id={`${baseId}-postal`}
            value={postalCode}
            readOnly={locked}
            onChange={(e) => onPostalChange(e.target.value)}
            placeholder="75001"
            inputMode={locked ? undefined : "numeric"}
            title={locked ? "Rempli via la recherche ou saisie manuelle activée" : undefined}
            className={`${inputCls} mt-1 ${readonlyFieldCls}`}
          />
        </div>
        <div>
          <label className={labelCls}>Ville</label>
          <input
            id={`${baseId}-city`}
            value={city}
            readOnly={locked}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="Paris"
            title={locked ? "Rempli via la recherche ou saisie manuelle activée" : undefined}
            className={`${inputCls} mt-1 ${readonlyFieldCls}`}
          />
        </div>
      </div>

      {showCountry && (
        <div>
          <label className={labelCls}>Pays (code ISO)</label>
          <input
            id={`${baseId}-country`}
            value={country}
            readOnly={locked}
            onChange={(e) => onCountryChange(e.target.value)}
            placeholder="FR"
            title={locked ? "Rempli via la recherche ou saisie manuelle activée" : undefined}
            className={`${inputCls} mt-1 ${readonlyFieldCls}`}
          />
        </div>
      )}
    </div>
  );
}
