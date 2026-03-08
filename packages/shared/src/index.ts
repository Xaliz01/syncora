export interface CustomerSummary {
  id: string;
  name: string;
  city?: string;
}

export interface HealthPayload {
  status: "ok" | "degraded" | "down";
  service: string;
}

export * from "./auth";
export * from "./dossier";
export * from "./organization";
export * from "./permissions";
export * from "./user";
export * from "./logger";
export * from "./nest-logger.adapter";

