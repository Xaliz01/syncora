/**
 * Config migrate-mongo pour @planwise/integrations-service.
 * URI : MONGODB_URI (même variable que Nest/Mongoose).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const mongodbUri =
  process.env.MONGODB_URI?.trim() || "mongodb://localhost:27017/planwise-integrations";

module.exports = {
  mongodb: {
    url: mongodbUri,
    options: {},
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
  moduleSystem: "commonjs",
};
