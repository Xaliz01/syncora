export const SERVICE_URLS = {
  cases: process.env.CASES_SERVICE_URL ?? "http://localhost:3004",
  users: process.env.USERS_SERVICE_URL ?? "http://localhost:3002",
  customers: process.env.CUSTOMERS_SERVICE_URL ?? "http://localhost:3009",
  technicians: process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006",
  integrations: process.env.INTEGRATIONS_SERVICE_URL ?? "http://localhost:3013",
} as const;
