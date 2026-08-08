export const SERVICE_URLS = {
  organizations: process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001",
  users: process.env.USERS_SERVICE_URL ?? "http://localhost:3002",
  permissions: process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003",
  cases: process.env.CASES_SERVICE_URL ?? "http://localhost:3004",
  fleet: process.env.FLEET_SERVICE_URL ?? "http://localhost:3005",
  technicians: process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006",
  stock: process.env.STOCK_SERVICE_URL ?? "http://localhost:3007",
  subscriptions: process.env.SUBSCRIPTIONS_SERVICE_URL ?? "http://localhost:3008",
  customers: process.env.CUSTOMERS_SERVICE_URL ?? "http://localhost:3009",
  notifications: process.env.NOTIFICATIONS_SERVICE_URL ?? "http://localhost:3010",
  documents: process.env.DOCUMENTS_SERVICE_URL ?? "http://localhost:3011",
  exports: process.env.EXPORTS_SERVICE_URL ?? "http://localhost:3012",
  integrations: process.env.INTEGRATIONS_SERVICE_URL ?? "http://localhost:3013",
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;
