export const SERVICE_URLS = {
  cases: process.env.CASES_SERVICE_URL ?? "http://localhost:3004",
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;
