import { resolveDatabaseUri } from "../database-uri";

describe("resolveDatabaseUri", () => {
  const keys = ["CASES_DB_URI", "MONGO_BASE_URI", "MONGODB_URI"] as const;
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of keys) previous[key] = process.env[key];
    for (const key of keys) delete process.env[key];
  });

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it("uses the dedicated variable", () => {
    process.env.CASES_DB_URI = "mongodb://mongo:27017/custom-cases";
    process.env.MONGO_BASE_URI = "mongodb://mongo:27017";
    process.env.MONGODB_URI = "mongodb://mongo:27017/other";
    expect(resolveDatabaseUri("cases")).toBe("mongodb://mongo:27017/custom-cases");
  });

  it("appends the database name to MONGO_BASE_URI", () => {
    process.env.MONGO_BASE_URI = "mongodb://mongodb:27017/";
    process.env.MONGODB_URI = "mongodb://mongodb:27017/planwise-users";
    expect(resolveDatabaseUri("cases")).toBe("mongodb://mongodb:27017/planwise-cases");
  });

  it("falls back to localhost and ignores a shared MONGODB_URI", () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/planwise-users";
    expect(resolveDatabaseUri("billing")).toBe("mongodb://localhost:27017/planwise-billing");
  });
});
