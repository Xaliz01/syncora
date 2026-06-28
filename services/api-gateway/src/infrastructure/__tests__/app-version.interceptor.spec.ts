import { ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { AppVersionInterceptor } from "../app-version.interceptor";

describe("AppVersionInterceptor", () => {
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

  function createContext(headers: Record<string, string> = {}) {
    return {
      switchToHttp: () => ({
        getResponse: () => ({
          setHeader: (name: string, value: string) => {
            headers[name] = value;
          },
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it("ajoute X-App-Version et X-Git-Sha sur les réponses", (done) => {
    process.env.APP_VERSION = "v0.1.0";
    process.env.GIT_SHA = "a1b2c3d";

    const headers: Record<string, string> = {};
    const interceptor = new AppVersionInterceptor();

    interceptor
      .intercept(createContext(headers), { handle: () => of({ ok: true }) })
      .subscribe(() => {
        expect(headers).toEqual({
          "X-App-Version": "v0.1.0",
          "X-Git-Sha": "a1b2c3d",
        });
        done();
      });
  });

  it("n'ajoute pas X-Git-Sha sans variable GIT_SHA", (done) => {
    process.env.APP_VERSION = "dev";
    delete process.env.GIT_SHA;

    const headers: Record<string, string> = {};
    const interceptor = new AppVersionInterceptor();

    interceptor
      .intercept(createContext(headers), { handle: () => of({ ok: true }) })
      .subscribe(() => {
        expect(headers).toEqual({ "X-App-Version": "dev" });
        done();
      });
  });
});
