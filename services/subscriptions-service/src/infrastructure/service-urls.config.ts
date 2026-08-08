export const SERVICE_URLS = {
  notifications: process.env.NOTIFICATIONS_SERVICE_URL ?? "http://localhost:3010",
  organizations: process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001",
} as const;
