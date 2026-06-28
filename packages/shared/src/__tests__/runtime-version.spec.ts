import { buildHealthPayload, readRuntimeVersion } from "../runtime-version";

describe("runtime-version", () => {
  const originalAppVersion = process.env.APP_VERSION;
  const originalGitSha = process.env.GIT_SHA;

  afterEach(() => {
    if (originalAppVersion === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = originalAppVersion;
    }
    if (originalGitSha === undefined) {
      delete process.env.GIT_SHA;
    } else {
      process.env.GIT_SHA = originalGitSha;
    }
  });

  describe("readRuntimeVersion", () => {
    it("retourne dev sans variables d'environnement", () => {
      delete process.env.APP_VERSION;
      delete process.env.GIT_SHA;
      expect(readRuntimeVersion()).toEqual({ version: "dev", gitSha: null });
    });

    it("lit APP_VERSION et GIT_SHA", () => {
      process.env.APP_VERSION = "v0.1.0";
      process.env.GIT_SHA = "a1b2c3d";
      expect(readRuntimeVersion()).toEqual({ version: "v0.1.0", gitSha: "a1b2c3d" });
    });
  });

  describe("buildHealthPayload", () => {
    it("inclut version et gitSha dans la charge utile", () => {
      process.env.APP_VERSION = "v0.1.0";
      process.env.GIT_SHA = "a1b2c3d";
      expect(buildHealthPayload("api-gateway")).toEqual({
        status: "ok",
        service: "api-gateway",
        version: "v0.1.0",
        gitSha: "a1b2c3d",
      });
    });

    it("omet gitSha quand absent", () => {
      process.env.APP_VERSION = "dev";
      delete process.env.GIT_SHA;
      expect(buildHealthPayload("api-gateway")).toEqual({
        status: "ok",
        service: "api-gateway",
        version: "dev",
      });
    });
  });
});
