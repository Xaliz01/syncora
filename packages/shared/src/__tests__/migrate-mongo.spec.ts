import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMigrateMongoConfig, resolveMigrateMongoPackageRoot } from "../migrate-mongo";

describe("createMigrateMongoConfig", () => {
  const originalUri = process.env.MONGODB_URI;

  afterEach(() => {
    if (originalUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalUri;
  });

  it("uses MONGODB_URI when set", () => {
    process.env.MONGODB_URI = "mongodb://example/db";
    const config = createMigrateMongoConfig({
      defaultUri: "mongodb://localhost:27017/fallback",
    });
    expect(config.mongodb.url).toBe("mongodb://example/db");
    expect(config.migrationsDir).toBe("migrations");
    expect(config.changelogCollectionName).toBe("changelog");
    expect(config.moduleSystem).toBe("commonjs");
  });

  it("falls back to defaultUri", () => {
    delete process.env.MONGODB_URI;
    const config = createMigrateMongoConfig({
      defaultUri: "mongodb://localhost:27017/planwise-cases",
      migrationsDir: "db/migrations",
    });
    expect(config.mongodb.url).toBe("mongodb://localhost:27017/planwise-cases");
    expect(config.migrationsDir).toBe("db/migrations");
  });
});

describe("resolveMigrateMongoPackageRoot", () => {
  it("finds migrate-mongo-config.js by walking up", () => {
    const root = mkdtempSync(join(tmpdir(), "planwise-migrate-"));
    writeFileSync(join(root, "migrate-mongo-config.js"), "module.exports = {};\n");
    const nested = join(root, "dist", "src");
    mkdirSync(nested, { recursive: true });

    expect(resolveMigrateMongoPackageRoot(nested)).toBe(root);
  });

  it("throws when config is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "planwise-migrate-missing-"));
    expect(() => resolveMigrateMongoPackageRoot(root)).toThrow(/migrate-mongo-config\.js/);
  });
});
