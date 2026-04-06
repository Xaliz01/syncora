export interface HealthPayload {
  status: "ok" | "degraded" | "down";
  service: string;
}

export * from "./auth";
export * from "./case";
export * from "./customer";
export * from "./organization";
export * from "./permissions";
export * from "./user";
export * from "./fleet";
export * from "./stock";
export * from "./subscription";
export * from "./logger";
export * from "./nest-logger.adapter";
export * from "./soft-delete";

