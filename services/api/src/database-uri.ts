const DB_DEFAULTS: Record<string, string> = {
  organizations: "mongodb://localhost:27017/planwise-organizations",
  users: "mongodb://localhost:27017/planwise-users",
  permissions: "mongodb://localhost:27017/planwise-permissions",
  cases: "mongodb://localhost:27017/planwise-cases",
  fleet: "mongodb://localhost:27017/planwise-fleet",
  technicians: "mongodb://localhost:27017/planwise-technicians",
  stock: "mongodb://localhost:27017/planwise-stock",
  customers: "mongodb://localhost:27017/planwise-customers",
  subscriptions: "mongodb://localhost:27017/planwise-subscriptions",
  notifications: "mongodb://localhost:27017/planwise-notifications",
  documents: "mongodb://localhost:27017/planwise-documents",
  integrations: "mongodb://localhost:27017/planwise-integrations",
  billing: "mongodb://localhost:27017/planwise-billing",
};

const ENV_KEYS: Record<string, string> = {
  organizations: "ORGANIZATIONS_DB_URI",
  users: "USERS_DB_URI",
  permissions: "PERMISSIONS_DB_URI",
  cases: "CASES_DB_URI",
  fleet: "FLEET_DB_URI",
  technicians: "TECHNICIANS_DB_URI",
  stock: "STOCK_DB_URI",
  customers: "CUSTOMERS_DB_URI",
  subscriptions: "SUBSCRIPTIONS_DB_URI",
  notifications: "NOTIFICATIONS_DB_URI",
  documents: "DOCUMENTS_DB_URI",
  integrations: "INTEGRATIONS_DB_URI",
  billing: "BILLING_DB_URI",
};

/** Bases qui ont un changelog migrate-mongo. */
export const MIGRATION_DATABASES = [
  "organizations",
  "users",
  "cases",
  "technicians",
  "stock",
  "customers",
  "integrations",
  "billing",
] as const;

export const DB_CONNECTION_NAMES = Object.keys(DB_DEFAULTS);

/**
 * URI d’une base nommée.
 * Priorité : variable dédiée, puis `MONGO_BASE_URI/planwise-<nom>`, puis localhost.
 * `MONGODB_URI` n’est pas réutilisée : une seule valeur ne peut pas viser 13 bases.
 */
export function resolveDatabaseUri(name: string): string {
  const envKey = ENV_KEYS[name];
  const specific = envKey ? process.env[envKey]?.trim() : undefined;
  if (specific) return specific;

  const base = process.env.MONGO_BASE_URI?.trim().replace(/\/+$/, "");
  if (base) return `${base}/planwise-${name}`;

  const fallback = DB_DEFAULTS[name];
  if (!fallback) {
    throw new Error(`Base Mongo inconnue : ${name}`);
  }
  return fallback;
}
