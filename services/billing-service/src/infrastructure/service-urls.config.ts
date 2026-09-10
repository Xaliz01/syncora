export const SERVICE_URLS = {
  cases: process.env.CASES_SERVICE_URL ?? "http://localhost:3004",
  notifications: process.env.NOTIFICATIONS_SERVICE_URL ?? "http://localhost:3010",
} as const;
