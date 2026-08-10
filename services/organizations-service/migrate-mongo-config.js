/**
 * Config migrate-mongo pour @planwise/organizations-service.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const { createMigrateMongoConfig } = require("@planwise/shared/nest");

module.exports = createMigrateMongoConfig({
  defaultUri: "mongodb://localhost:27017/planwise-organizations",
});
