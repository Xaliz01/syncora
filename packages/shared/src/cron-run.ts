/** Journal des exécutions de crons (backoffice plateforme). */

export type CronRunStatus = "running" | "ok" | "error" | "skipped";

export type PlatformCronJobKey =
  | "integrations.invoice-sync"
  | "notifications.intervention-reminders"
  | "organizations.trial-test-data-cleanup";

export interface PlatformCronJobDefinition {
  jobKey: PlatformCronJobKey;
  service: "integrations-service" | "notifications-service" | "organizations-service";
  label: string;
  schedule: string;
  description: string;
}

/** Catalogue des jobs connus (UI + agrégation gateway). */
export const PLATFORM_CRON_JOBS: PlatformCronJobDefinition[] = [
  {
    jobKey: "integrations.invoice-sync",
    service: "integrations-service",
    label: "Sync factures (Pennylane / Qonto)",
    schedule: "Toutes les 10 minutes",
    description:
      "Rafraîchit le statut distant des factures liées et aligne le billingStatus des dossiers.",
  },
  {
    jobKey: "notifications.intervention-reminders",
    service: "notifications-service",
    label: "Rappels d’interventions",
    schedule: "Toutes les minutes",
    description: "Envoie les rappels in-app / push / email avant les interventions planifiées.",
  },
  {
    jobKey: "organizations.trial-test-data-cleanup",
    service: "organizations-service",
    label: "Purge données de démo essai",
    schedule: "Tous les jours à 04:00 (Europe/Paris)",
    description: "Supprime les données de test des organisations dont l’essai est terminé.",
  },
];

export interface CronRunStats {
  /** Nombre d’éléments traités / examinés (sens métier selon le job). */
  processed?: number;
  /** Succès partiels ou actions effectuées. */
  succeeded?: number;
  /** Échecs unitaires (ex. syncs en erreur). */
  failed?: number;
  /** Skipped / ignorés. */
  skipped?: number;
  /** Stats libres additionnelles. */
  [key: string]: number | string | boolean | undefined;
}

export interface CronRunResponse {
  id: string;
  jobKey: PlatformCronJobKey | string;
  service: string;
  status: CronRunStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  stats?: CronRunStats;
  errorMessage?: string;
}

export interface CronRunsListResponse {
  runs: CronRunResponse[];
  total: number;
}

export interface PlatformCronJobsOverviewResponse {
  jobs: Array<
    PlatformCronJobDefinition & {
      lastRun?: CronRunResponse;
    }
  >;
}
