"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { globalSearch, type SearchResultItem } from "@/lib/search.api";

const TYPE_LABELS: Record<string, string> = {
  case: "Dossiers",
  intervention: "Interventions",
  customer: "Clients",
  order_giver: "Donneurs d'ordre",
  vehicle: "Véhicules",
  technician: "Techniciens",
  team: "Équipes",
  agence: "Agences",
  article: "Articles",
  prestation: "Prestations",
  user: "Utilisateurs",
};

const TYPE_ICONS: Record<string, JSX.Element> = {
  case: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  ),
  intervention: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17l-5.2-5.2m0 0l5.2-5.2m-5.2 5.2H21.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  ),
  customer: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.98 5.98 0 00-.34-1.99m0 0A5.981 5.981 0 0012 13.5a5.981 5.981 0 00-5.66 3.23m11.32 0A9.053 9.053 0 0112 15c-1.768 0-3.422.48-4.862 1.32M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  order_giver: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  ),
  vehicle: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h17.25M3.375 14.25V6.75A2.25 2.25 0 015.625 4.5h8.25a2.25 2.25 0 012.25 2.25v7.5"
      />
    </svg>
  ),
  technician: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17l-5.2-5.2m0 0l5.2-5.2m-5.2 5.2H21.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  ),
  team: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.98 5.98 0 00-.34-1.99m0 0A5.981 5.981 0 0012 13.5a5.981 5.981 0 00-5.66 3.23m11.32 0A9.053 9.053 0 0112 15c-1.768 0-3.422.48-4.862 1.32M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  agence: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21"
      />
    </svg>
  ),
  article: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  ),
  prestation: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
      />
    </svg>
  ),
  user: (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  ),
};

const TYPE_COLORS: Record<string, string> = {
  case: "bg-blue-50 text-blue-600",
  intervention: "bg-violet-50 text-violet-600",
  customer: "bg-sky-50 text-sky-700",
  order_giver: "bg-cyan-50 text-cyan-700",
  vehicle: "bg-emerald-50 text-emerald-600",
  technician: "bg-amber-50 text-amber-600",
  team: "bg-indigo-50 text-indigo-600",
  agence: "bg-teal-50 text-teal-700",
  article: "bg-rose-50 text-rose-600",
  prestation: "bg-orange-50 text-orange-700",
  user: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
};

const TYPE_ORDER = [
  "case",
  "intervention",
  "customer",
  "order_giver",
  "vehicle",
  "technician",
  "team",
  "agence",
  "article",
  "prestation",
  "user",
];

function ResultCard({ item }: { item: SearchResultItem }) {
  return (
    <Link
      href={item.url}
      className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-brand-300 hover:shadow-sm dark:shadow-slate-950/20 transition"
    >
      <span
        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${TYPE_COLORS[item.type] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
      >
        {TYPE_ICONS[item.type]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            {item.subtitle}
          </p>
        )}
        <span
          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[item.type] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
        >
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
      </div>
    </Link>
  );
}

export function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(queryFromUrl);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["global-search", queryFromUrl],
    queryFn: () => globalSearch(queryFromUrl),
    enabled: queryFromUrl.length > 0,
  });

  const filteredResults = activeFilter
    ? (data?.results ?? []).filter((r) => r.type === activeFilter)
    : (data?.results ?? []);

  const availableTypes = TYPE_ORDER.filter((t) => (data?.counts?.[t] ?? 0) > 0);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
        Recherche globale
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = inputValue.trim();
          if (q) {
            setActiveFilter(null);
            router.push(`/search?q=${encodeURIComponent(q)}`);
          }
        }}
        className="mb-6"
      >
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Rechercher par mot-clé…"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2.5 pl-11 pr-4 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
            autoFocus
          />
        </div>
      </form>

      {queryFromUrl && !isLoading && !error && data && (
        <>
          {availableTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeFilter === null
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Tout ({data.results.length})
              </button>
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    activeFilter === type
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {TYPE_LABELS[type]} ({data.counts[type]})
                </button>
              ))}
            </div>
          )}

          {filteredResults.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-12 text-center">
              <svg
                className="mx-auto h-10 w-10 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                Aucun résultat pour &laquo;&nbsp;{queryFromUrl}&nbsp;&raquo;
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Essayez un autre mot-clé ou vérifiez l&apos;orthographe.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredResults.map((item) => (
                <ResultCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-brand-600" />
          <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
            Recherche en cours…
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {(error as Error).message}
        </div>
      )}

      {!queryFromUrl && (
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            Saisissez un mot-clé pour lancer une recherche
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            La recherche couvre les dossiers, interventions, clients, donneurs d&apos;ordre,
            véhicules, techniciens, équipes, agences, articles, prestations et utilisateurs.
          </p>
        </div>
      )}
    </div>
  );
}
