export interface HealthPayload {
  status: "ok" | "degraded" | "down";
  service: string;
  version: string;
  gitSha?: string;
}

export interface RuntimeVersion {
  version: string;
  gitSha: string | null;
}

/** Lit APP_VERSION / GIT_SHA (injectés au build Docker par la CD, ou "dev" en local). */
export function readRuntimeVersion(): RuntimeVersion {
  const version = process.env.APP_VERSION?.trim() || "dev";
  const gitSha = process.env.GIT_SHA?.trim() || null;
  return { version, gitSha };
}

export function buildHealthPayload(
  service: string,
  status: HealthPayload["status"] = "ok",
): HealthPayload {
  const { version, gitSha } = readRuntimeVersion();
  return {
    status,
    service,
    version,
    ...(gitSha ? { gitSha } : {}),
  };
}
