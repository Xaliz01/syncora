/**
 * Config migrate-mongo pour @planwise/users-service.
 * URI : MONGODB_URI (même variable que Nest/Mongoose).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const { createMigrateMongoConfig } = require("@planwise/shared/nest");

module.exports = createMigrateMongoConfig({
  defaultUri: "mongodb://localhost:27017/planwise-users",
});
