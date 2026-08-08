export const SERVICE_URLS = {
  cases: process.env.CASES_SERVICE_URL ?? "http://localhost:3004",
  users: process.env.USERS_SERVICE_URL ?? "http://localhost:3002",
  subscriptions: process.env.SUBSCRIPTIONS_SERVICE_URL ?? "http://localhost:3008",
  technicians: process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006",
} as const;
