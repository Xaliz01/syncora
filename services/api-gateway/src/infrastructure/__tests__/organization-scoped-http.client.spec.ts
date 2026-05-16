import { ForbiddenException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { OrganizationScopedHttpClient } from "../organization-scoped-http.client";

describe("OrganizationScopedHttpClient", () => {
  const httpService = {
    request: jest.fn(),
  };
  const client = new OrganizationScopedHttpClient(httpService as unknown as HttpService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("injects organizationId in query and validates scoped responses", async () => {
    httpService.request.mockReturnValue(
      of({
        data: [{ id: "c1", organizationId: "org-a" }],
      }),
    );

    const result = await client.request({
      baseUrl: "http://localhost:3009",
      organizationId: "org-a",
      method: "get",
      path: "/customers",
    });

    expect(result).toEqual([{ id: "c1", organizationId: "org-a" }]);
    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ organizationId: "org-a" }),
      }),
    );
  });

  it("rejects cross-tenant responses", async () => {
    httpService.request.mockReturnValue(
      of({
        data: [{ id: "c1", organizationId: "org-b" }],
      }),
    );

    await expect(
      client.request({
        baseUrl: "http://localhost:3009",
        organizationId: "org-a",
        method: "get",
        path: "/customers",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects body organizationId mismatch before calling downstream", async () => {
    await expect(
      client.request({
        baseUrl: "http://localhost:3009",
        organizationId: "org-a",
        method: "post",
        path: "/customers",
        body: { organizationId: "org-b", kind: "company", companyName: "ACME" },
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(httpService.request).not.toHaveBeenCalled();
  });
});
