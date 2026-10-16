/** Rôle du processus Nest. Défaut `all` : HTTP + crons (dev local, un seul process). */
export const PLANWISE_PROCESSES = ["all", "api", "worker", "notifications"] as const;

export type PlanwiseProcess = (typeof PLANWISE_PROCESSES)[number];

export function planwiseProcess(): PlanwiseProcess {
  const raw = (process.env.PLANWISE_PROCESS ?? "all").trim().toLowerCase();
  if (raw === "api" || raw === "worker" || raw === "notifications" || raw === "all") {
    return raw;
  }
  return "all";
}

/** Routes HTTP métier. Le health check reste enregistré dans tous les rôles. */
export function runsHttp(): boolean {
  const role = planwiseProcess();
  return role === "all" || role === "api";
}

/** Visites de maintenance et purge des données d’essai. */
export function runsWorkerCrons(): boolean {
  const role = planwiseProcess();
  return role === "all" || role === "worker";
}

/** Rappels d’intervention et de visite (minute / heure). */
export function runsNotificationCrons(): boolean {
  const role = planwiseProcess();
  return role === "all" || role === "notifications";
}

/** Migrations Mongo au boot (API et worker). Le process notifications s’appuie sur elles. */
export function runsMigrations(): boolean {
  const role = planwiseProcess();
  return role === "all" || role === "api" || role === "worker";
}

export function defaultListenPort(): number {
  switch (planwiseProcess()) {
    case "worker":
      return 3020;
    case "notifications":
      return 3010;
    default:
      return 3000;
  }
}

export function processServiceName(): string {
  switch (planwiseProcess()) {
    case "worker":
      return "planwise-worker";
    case "notifications":
      return "planwise-notifications";
    default:
      return "api";
  }
}

export function httpControllers<T>(controllers: T[]): T[] {
  return runsHttp() ? controllers : [];
}

export function whenWorkerCrons<T>(providers: T[]): T[] {
  return runsWorkerCrons() ? providers : [];
}
