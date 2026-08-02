/** Journal des exécutions de crons (backoffice plateforme). */

export type CronRunStatus = "running" | "ok" | "error" | "skipped";

export type PlatformCronJobKey =
  | "integrations.invoice-sync"
  | "notifications.intervention-reminders"
  | "notifications.maintenance-visit-reminders"
  | "organizations.trial-test-data-cleanup"
  | "cases.maintenance-contract-visits";

export interface PlatformCronJobDefinition {
  jobKey: PlatformCronJobKey;
  service:
    | "integrations-service"
    | "notifications-service"
    | "organizations-service"
    | "cases-service";
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
    jobKey: "notifications.maintenance-visit-reminders",
    service: "notifications-service",
    label: "Rappels visites de maintenance",
    schedule: "Toutes les heures",
    description:
      "Notifie l’équipe lorsqu’une visite de contrat (mode à programmer) entre dans la fenêtre de rappel.",
  },
  {
    jobKey: "organizations.trial-test-data-cleanup",
    service: "organizations-service",
    label: "Purge données de démo essai",
    schedule: "Tous les jours à 04:00 (Europe/Paris)",
    description: "Supprime les données de test des organisations dont l’essai est terminé.",
  },
  {
    jobKey: "cases.maintenance-contract-visits",
    service: "cases-service",
    label: "Visites contrats de maintenance",
    schedule: "Toutes les heures",
    description:
      "Auto-planifie les contrats en mode auto_plan ; marque « à programmer » les contrats en mode schedule_with_client dans la fenêtre de rappel.",
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
