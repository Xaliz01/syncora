import { AppService } from "../app.service";

describe("AppService", () => {
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

  it("expose la version dans le health check", () => {
    process.env.APP_VERSION = "v0.1.0";
    process.env.GIT_SHA = "a1b2c3d";

    const service = new AppService();
    expect(service.getHealth()).toEqual({
      status: "ok",
      service: "api-gateway",
      version: "v0.1.0",
      gitSha: "a1b2c3d",
    });
  });
});
