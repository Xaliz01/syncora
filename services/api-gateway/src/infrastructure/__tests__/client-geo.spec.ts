import type { Request } from "express";
import * as geoip from "geoip-lite";
import { extractClientIp, resolveClientGeo } from "../client-geo";

jest.mock("geoip-lite", () => ({
  lookup: jest.fn(),
}));

describe("client-geo", () => {
  const lookup = geoip.lookup as jest.Mock;

  beforeEach(() => {
    lookup.mockReset();
  });

  function mockReq(overrides: Partial<Request> & { headers?: Record<string, string> }): Request {
    return {
      headers: {},
      ip: undefined,
      socket: { remoteAddress: undefined },
      ...overrides,
    } as unknown as Request;
  }

  it("prefers Cloudflare country header over geoip", () => {
    lookup.mockReturnValue({ country: "US", region: "CA" });
    const geo = resolveClientGeo(
      mockReq({
        headers: { "cf-ipcountry": "fr", "x-forwarded-for": "8.8.8.8" },
      }),
    );
    expect(geo).toEqual({ country: "FR" });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("falls back to geoip-lite from client IP", () => {
    lookup.mockReturnValue({ country: "DE", region: "BE" });
    const geo = resolveClientGeo(
      mockReq({
        headers: { "x-forwarded-for": "1.2.3.4" },
      }),
    );
    expect(extractClientIp(mockReq({ headers: { "x-forwarded-for": "1.2.3.4, 9.9.9.9" } }))).toBe(
      "1.2.3.4",
    );
    expect(geo).toEqual({ country: "DE", region: "BE" });
    expect(lookup).toHaveBeenCalledWith("1.2.3.4");
  });

  it("skips loopback addresses", () => {
    const geo = resolveClientGeo(mockReq({ ip: "127.0.0.1" }));
    expect(geo).toEqual({});
    expect(lookup).not.toHaveBeenCalled();
  });
});
