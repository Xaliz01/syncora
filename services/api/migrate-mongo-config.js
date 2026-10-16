/**
 * Config migrate-mongo du monolithe.
 * `MIGRATE_DATABASE` choisit le dossier `migrations/<base>` et l’URI par défaut.
 * Le runner de boot force `MONGODB_URI` pour chaque base (dotenv ne l’écrase pas).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const { createMigrateMongoConfig } = require("@planwise/shared/nest");

const databases = {
  organizations: "mongodb://localhost:27017/planwise-organizations",
  users: "mongodb://localhost:27017/planwise-users",
  cases: "mongodb://localhost:27017/planwise-cases",
  technicians: "mongodb://localhost:27017/planwise-technicians",
  stock: "mongodb://localhost:27017/planwise-stock",
  customers: "mongodb://localhost:27017/planwise-customers",
  integrations: "mongodb://localhost:27017/planwise-integrations",
  billing: "mongodb://localhost:27017/planwise-billing",
};

const database = process.env.MIGRATE_DATABASE || "organizations";
const defaultUri = databases[database];
if (!defaultUri) {
  throw new Error(`MIGRATE_DATABASE inconnu : ${database}`);
}

module.exports = createMigrateMongoConfig({
  defaultUri,
  migrationsDir: `migrations/${database}`,
});
