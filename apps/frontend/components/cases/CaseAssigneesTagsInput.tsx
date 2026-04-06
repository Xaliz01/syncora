"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type CaseAssigneeOption = { id: string; label: string };

type CaseAssigneesTagsInputProps = {
  options: CaseAssigneeOption[];
  value: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
  /** Texte du champ pour ajouter / filtrer */
  placeholder?: string;
  className?: string;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function CaseAssigneesTagsInput({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Ajouter un assigné…",
  className = ""
}: CaseAssigneesTagsInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const labelById = useMemo(
    () => new Map(options.map((o) => [o.id, o.label])),
    [options]
  );

  const selectedSet = useMemo(() => new Set(value), [value]);

  const suggestions = useMemo(() => {
    const q = normalize(query);
    return options
      .filter((o) => !selectedSet.has(o.id))
      .filter((o) => !q || normalize(o.label).includes(q))
      .slice(0, 12);
  }, [options, selectedSet, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const remove = (id: string) => {
    if (disabled) return;
    onChange(value.filter((x) => x !== id));
  };

  const add = (id: string) => {
    if (disabled || selectedSet.has(id)) return;
    onChange([...value, id]);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className={`flex flex-wrap items-center gap-1.5 min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 transition ${
          disabled ? "bg-slate-50 dark:bg-slate-950 opacity-80" : "focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500"
        }`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {value.map((id) => {
          const label = labelById.get(id) ?? id;
          return (
            <span
              key={id}
              className="inline-flex max-w-full items-center gap-0.5 rounded-md border border-brand-200 bg-brand-50 pl-2 pr-0.5 py-0.5 text-sm text-brand-900"
            >
              <span className="truncate">{label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(id);
                  }}
                  className="shrink-0 rounded p-0.5 text-brand-700 dark:text-brand-400 hover:bg-brand-100 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  aria-label={`Retirer ${label}`}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
              }
            }}
            placeholder={value.length === 0 ? placeholder : "Ajouter…"}
            className="flex-1 min-w-[8rem] border-0 bg-transparent py-1 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-0"
          />
        )}
      </div>
      {!disabled && open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
          {suggestions.map((o) => (
            <button
              key={o.id}
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {!disabled && open && query.trim() && suggestions.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 shadow-lg">
          Aucun membre ne correspond.
        </p>
      )}
    </div>
  );
}
