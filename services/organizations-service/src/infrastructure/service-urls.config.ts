export const SERVICE_URLS = {
  subscriptions: process.env.SUBSCRIPTIONS_SERVICE_URL ?? "http://localhost:3008",
  cases: process.env.CASES_SERVICE_URL ?? "http://localhost:3004",
  stock: process.env.STOCK_SERVICE_URL ?? "http://localhost:3007",
  fleet: process.env.FLEET_SERVICE_URL ?? "http://localhost:3005",
  technicians: process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006",
  customers: process.env.CUSTOMERS_SERVICE_URL ?? "http://localhost:3009",
  permissions: process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003",
} as const;
