"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AgenceResponse, PostalAddress, TeamResponse } from "@syncora/shared";
import {
  ESTIMATED_DIESEL_EUR_PER_LITER,
  formatPostalAddress,
  rankTeamsForCustomerSite,
  type RankTeamsResult,
  type TeamRouteInsight,
} from "@/lib/team-route-insights";

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Litres × prix (réparation cache / données sans fuelCostEurOneWay) */
function fuelCostEurOneWayResolved(insight: TeamRouteInsight): number {
  const direct = insight.fuelCostEurOneWay;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  const liters =
    typeof insight.fuelLitersOneWay === "number" && Number.isFinite(insight.fuelLitersOneWay)
      ? insight.fuelLitersOneWay
      : 0;
  return Math.round(liters * ESTIMATED_DIESEL_EUR_PER_LITER * 100) / 100;
}

function formatInsightFuelCost(insight: TeamRouteInsight): string {
  const eur = fuelCostEurOneWayResolved(insight);
  return Number.isFinite(eur) ? eurFmt.format(eur) : "—";
}

function hasAssignableSite(addr: PostalAddress | null | undefined): boolean {
  if (!addr?.line1?.trim()) return false;
  return Boolean((addr.postalCode && addr.postalCode.trim()) || (addr.city && addr.city.trim()));
}

function formatDriveMinutes(m: number): string {
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} h ${mm}` : `${h} h`;
}

function InsightRow({
  insight,
  selectedTeamId,
  onPick,
  savingsVersusWorstL,
  savingsVersusWorstEur,
  showSavings,
  recommendedTeamId,
}: {
  insight: TeamRouteInsight;
  selectedTeamId: string;
  onPick: (teamId: string) => void;
  savingsVersusWorstL?: number;
  savingsVersusWorstEur?: number;
  showSavings?: boolean;
  recommendedTeamId?: string;
}) {
  const selected = selectedTeamId === insight.teamId;
  const ok = insight.geocodeTeamOk && insight.geocodeClientOk;
  const isRecommended = Boolean(recommendedTeamId && insight.teamId === recommendedTeamId && ok);

  return (
    <button
      type="button"
      onClick={() => ok && onPick(insight.teamId)}
      disabled={!ok}
      className={`group w-full text-left rounded-xl border px-3 py-2.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 ${
        isRecommended
          ? "border-emerald-400/80 bg-gradient-to-br from-emerald-50/90 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/25 shadow-md shadow-emerald-900/10"
          : selected
            ? "border-brand-400 bg-brand-50/80 dark:bg-brand-950/30 dark:border-brand-600"
            : "border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600"
      } ${!ok ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {isRecommended && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 shadow-sm">
                <span aria-hidden>✦</span> Meilleur choix
              </span>
            )}
            {insight.rank <= 3 && !isRecommended && ok && (
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                #{insight.rank}
              </span>
            )}
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
              {insight.teamName}
            </span>
            {selected && (
              <span className="text-[10px] text-brand-700 dark:text-brand-300">(sélectionnée)</span>
            )}
          </div>
          {insight.agenceLabel && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Agence : {insight.agenceLabel}
            </p>
          )}
        </div>
        {ok && (
          <div
            className="shrink-0 text-right"
            title="Score d’adéquation (basé sur la distance estimée)"
          >
            <div className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
              {insight.score}
              <span className="text-xs font-medium text-slate-400">/100</span>
            </div>
          </div>
        )}
      </div>
      {ok && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[11px]">
          <div className="rounded-md bg-white/60 dark:bg-slate-950/30 px-2 py-1 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-slate-500 dark:text-slate-400">Distance (estim.)</div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
              {insight.roadKm} km
            </div>
          </div>
          <div className="rounded-md bg-white/60 dark:bg-slate-950/30 px-2 py-1 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-slate-500 dark:text-slate-400">Temps de route</div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {formatDriveMinutes(insight.driveMinutes)}
            </div>
          </div>
          <div className="rounded-md bg-white/60 dark:bg-slate-950/30 px-2 py-1 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-slate-500 dark:text-slate-400">Carburant (aller)</div>
            <div className="font-semibold text-amber-800 dark:text-amber-200 tabular-nums">
              {insight.fuelLitersOneWay.toFixed(2)} L
            </div>
          </div>
          <div className="rounded-md bg-white/60 dark:bg-slate-950/30 px-2 py-1 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-slate-500 dark:text-slate-400">Coût carburant (estim.)</div>
            <div className="font-semibold text-amber-900 dark:text-amber-100 tabular-nums">
              {formatInsightFuelCost(insight)}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
              aller simple
            </div>
          </div>
          <div className="rounded-md bg-white/60 dark:bg-slate-950/30 px-2 py-1 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-slate-500 dark:text-slate-400">CO₂ (aller)</div>
            <div className="font-semibold text-slate-700 dark:text-emerald-200 tabular-nums">
              {insight.co2KgOneWay.toFixed(2)} kg
            </div>
          </div>
        </div>
      )}
      {!ok && (
        <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-200">
          Impossible de calculer la distance (agence ou client non localisé).
        </p>
      )}
      {showSavings &&
        ok &&
        savingsVersusWorstL != null &&
        savingsVersusWorstL > 0.05 &&
        savingsVersusWorstEur != null &&
        Number.isFinite(savingsVersusWorstEur) &&
        savingsVersusWorstEur > 0 && (
          <p className="mt-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
            ≈ {savingsVersusWorstL.toFixed(2)} L ({eurFmt.format(savingsVersusWorstEur)}) de moins
            en aller simple qu’avec l’équipe la plus éloignée (estim.).
          </p>
        )}
    </button>
  );
}

function skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
      <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
    </div>
  );
}

export interface InterventionTeamOptimizerProps {
  teams: TeamResponse[];
  agences: AgenceResponse[];
  /** Résolution listAgences + getAgence par équipe */
  agencesLoading?: boolean;
  agencesError?: boolean;
  /** Dossier avec client lié (permet de charger l’adresse) */
  customerLinked?: boolean;
  customerAddress?: PostalAddress | null;
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
}

export function InterventionTeamOptimizer({
  teams,
  agences,
  agencesLoading = false,
  agencesError = false,
  customerLinked = true,
  customerAddress,
  selectedTeamId,
  onSelectTeam,
}: InterventionTeamOptimizerProps) {
  const addrKey = customerAddress ? formatPostalAddress(customerAddress) : "";
  const canCompute = hasAssignableSite(customerAddress ?? undefined);
  const teamsWithAgence = teams.some((t) => Boolean(t.agenceId));
  const appliedSuggestionRef = useRef(false);

  const queryKey = useMemo(
    () => [
      "team-route-insights",
      "v2-fuelcost",
      teams
        .map((t) => t.id)
        .sort()
        .join(","),
      agences
        .map((a) => a.id)
        .sort()
        .join(","),
      addrKey,
    ],
    [teams, agences, addrKey],
  );

  const routingReady =
    teams.length > 0 && !agencesLoading && (agences.length > 0 || !teamsWithAgence);

  const insightsEnabled =
    routingReady && canCompute && !(teamsWithAgence && agences.length === 0 && !agencesLoading);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: (): Promise<RankTeamsResult> =>
      rankTeamsForCustomerSite(teams, agences, customerAddress ?? null),
    enabled: insightsEnabled,
    staleTime: 60_000,
  });

  const savingsMeta = useMemo(() => {
    if (!data?.insights?.length)
      return { bestId: undefined as string | undefined, savingL: 0, savingEur: 0 };
    const valid = data.insights.filter((i) => i.geocodeTeamOk && i.geocodeClientOk);
    if (valid.length < 2) return { bestId: valid[0]?.teamId, savingL: 0, savingEur: 0 };
    const worst = valid.reduce((a, b) => (a.roadKm >= b.roadKm ? a : b));
    const best = valid.reduce((a, b) => (a.roadKm <= b.roadKm ? a : b));
    const savingL = Math.max(0, worst.fuelLitersOneWay - best.fuelLitersOneWay);
    const savingEur = Math.max(
      0,
      fuelCostEurOneWayResolved(worst) - fuelCostEurOneWayResolved(best),
    );
    return { bestId: best.teamId, savingL, savingEur };
  }, [data]);

  useEffect(() => {
    appliedSuggestionRef.current = false;
  }, [addrKey]);

  useEffect(() => {
    if (!data?.clientGeocodeOk || !savingsMeta.bestId || selectedTeamId) return;
    if (appliedSuggestionRef.current) return;
    appliedSuggestionRef.current = true;
    onSelectTeam(savingsMeta.bestId);
  }, [data?.clientGeocodeOk, savingsMeta.bestId, selectedTeamId, onSelectTeam]);

  if (!teams.length) {
    return null;
  }

  if (!customerLinked) {
    return (
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/25 px-3 py-3">
        <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
          Optimisation trajet
        </p>
        <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90 mt-1">
          Associez un client à ce dossier pour calculer automatiquement la distance depuis chaque
          agence jusqu’au lieu d’intervention.
        </p>
      </div>
    );
  }

  if (!canCompute) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/25 px-3 py-3">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
          Optimisation trajet (carburant & CO₂)
        </p>
        <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-1">
          Renseignez une adresse complète sur la fiche client (rue, code postal, ville) pour
          comparer automatiquement les équipes depuis leur agence jusqu’au lieu d’intervention.
        </p>
      </div>
    );
  }

  if (agencesLoading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
          Optimisation trajet
        </p>
        <div className="mt-2 animate-pulse space-y-2">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>
    );
  }

  if (agencesError && teamsWithAgence) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/25 px-3 py-3">
        <p className="text-xs font-semibold text-red-900 dark:text-red-200">Optimisation trajet</p>
        <p className="text-[11px] text-red-800/90 dark:text-red-300/90 mt-1">
          Impossible de charger les fiches agence. Vérifiez votre connexion ou demandez l’accès
          lecture aux agences si le problème persiste.
        </p>
      </div>
    );
  }

  if (!agences.length && teamsWithAgence) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/25 px-3 py-3">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
          Optimisation trajet
        </p>
        <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-1">
          Les équipes sont rattachées à une agence, mais aucune adresse de base n’a pu être chargée.
          Vérifiez que chaque agence a bien une adresse renseignée dans la flotte.
        </p>
      </div>
    );
  }

  if (!agences.length && !teamsWithAgence) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 px-3 py-3">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Optimisation trajet
        </p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
          Rattachez chaque équipe à une agence disposant d’une adresse dans la flotte pour estimer
          la distance jusqu’au client.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50/90 to-white dark:from-slate-900 dark:to-slate-950 p-3 shadow-sm">
      <div className="flex items-start gap-2 mb-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-md shadow-brand-900/20"
          aria-hidden
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 13L9 7"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
            Suggestion intelligente d’équipe
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Estimation route & consommation (BAN + modèle — pas de clé API).
            {data?.customerAddressSummary && (
              <span
                className="block mt-1 text-slate-600 dark:text-slate-300 truncate"
                title={data.customerAddressSummary}
              >
                Vers : {data.customerAddressSummary}
              </span>
            )}
          </p>
        </div>
      </div>

      {isLoading && skeleton()}

      {isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Impossible de calculer les trajets pour le moment. Réessayez plus tard.
        </p>
      )}

      {!isLoading && data && !data.clientGeocodeOk && (
        <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-2 py-2 border border-amber-200 dark:border-amber-900/50">
          L’adresse du client n’a pas été trouvée dans la Base Adresse Nationale. Vérifiez le
          libellé (rue, CP, ville).
        </p>
      )}

      {!isLoading && data?.clientGeocodeOk && data.insights.length > 0 && (
        <div className="space-y-2 mt-1">
          {data.insights.map((insight) => (
            <InsightRow
              key={insight.teamId}
              insight={insight}
              selectedTeamId={selectedTeamId}
              onPick={onSelectTeam}
              recommendedTeamId={savingsMeta.bestId}
              showSavings={insight.teamId === savingsMeta.bestId}
              savingsVersusWorstL={savingsMeta.savingL}
              savingsVersusWorstEur={savingsMeta.savingEur}
            />
          ))}
        </div>
      )}

      {!isLoading && data?.clientGeocodeOk && (
        <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
          Distances et consommation indicatives (vol d’oiseau corrigé, pas d’itinéraire GPS). Coût
          carburant basé sur un prix diesel de référence {ESTIMATED_DIESEL_EUR_PER_LITER.toFixed(2)}{" "}
          €/L (ordre de grandeur, hors cartes carburant). À comparer avec vos données réelles.
        </p>
      )}
    </div>
  );
}
