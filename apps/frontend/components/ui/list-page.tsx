"use client";

import Link from "next/link";
import React from "react";

function cn(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Filtre client insensible à la casse sur plusieurs champs texte. */
export function filterListItems<T>(
  items: T[],
  query: string,
  getSearchableParts: (item: T) => (string | undefined | null)[]
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const parts = getSearchableParts(item);
    return parts.some((p) => (p ?? "").toLowerCase().includes(q));
  });
}

export function ListPageRoot({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

export function ListPageHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        {description ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ListPrimaryAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition self-start flex-shrink-0"
    >
      {children}
    </Link>
  );
}

export function ListPageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 sm:p-4 text-sm text-red-700 dark:text-red-300">
      <span>{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-red-800 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

export function ListSearchField({
  value,
  onChange,
  placeholder = "Rechercher ou filtrer…",
  className
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full sm:max-w-md", className)}>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );
}

export function ListToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">{children}</div>
  );
}

export function ListLoadingState() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">
      Chargement…
    </div>
  );
}

export function ListEmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{message}</p>
      {action}
    </div>
  );
}

export function ListNoResults({ message = "Aucun résultat ne correspond à votre recherche." }: { message?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
      {message}
    </div>
  );
}

/**
 * En-têtes + lignes : passer la même classe grille pour l’en-tête (md+) et chaque ligne.
 * Ex. gridTemplateClass="md:grid-cols-[1.5fr_1fr_0.5fr]"
 */
export function ListTableShell({
  gridTemplateClass,
  headerCells,
  children
}: {
  gridTemplateClass: string;
  headerCells: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm dark:shadow-none">
      <div
        className={cn(
          "hidden md:grid gap-3 border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500",
          gridTemplateClass
        )}
      >
        {headerCells}
      </div>
      {children}
    </div>
  );
}

export function ListRowLink({
  href,
  gridTemplateClass,
  children
}: {
  href: string;
  gridTemplateClass: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "grid gap-2 md:gap-3 items-center px-4 py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition",
        gridTemplateClass
      )}
    >
      {children}
    </Link>
  );
}

export function ListRow({
  gridTemplateClass,
  children,
  className
}: {
  gridTemplateClass: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 md:gap-3 items-center px-4 py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0",
        gridTemplateClass,
        className
      )}
    >
      {children}
    </div>
  );
}

export function ListCellPrimary({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-medium text-brand-600 dark:text-brand-400 truncate min-w-0", className)}>
      {children}
    </span>
  );
}

export function ListCellMuted({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-sm text-slate-500 dark:text-slate-400 truncate min-w-0", className)}>{children}</span>
  );
}

export function ListCellDefault({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-sm text-slate-600 dark:text-slate-300 truncate min-w-0", className)}>{children}</span>
  );
}

export function ListBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn("inline-flex w-fit max-w-full rounded-full border px-2 py-0.5 text-xs truncate", className)}
    >
      {children}
    </span>
  );
}
