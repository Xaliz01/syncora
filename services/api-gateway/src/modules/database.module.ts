import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

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

function resolveUri(name: string): string {
  const envKey = ENV_KEYS[name];
  return (envKey && process.env[envKey]) || process.env.MONGODB_URI || DB_DEFAULTS[name];
}

export const DB_CONNECTION_NAMES = Object.keys(DB_DEFAULTS);

@Global()
@Module({
  imports: Object.keys(DB_DEFAULTS).map((name) =>
    MongooseModule.forRoot(resolveUri(name), { connectionName: name }),
  ),
})
export class DatabaseModule {}
