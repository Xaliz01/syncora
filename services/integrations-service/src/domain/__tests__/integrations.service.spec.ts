import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { of } from "rxjs";
import { IntegrationsService } from "../integrations.service";
import { signOAuthState } from "../oauth-state";

describe("IntegrationsService", () => {
  const credentialModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  };
  const syncModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const httpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const service = new IntegrationsService(
    httpService as never,
    credentialModel as never,
    syncModel as never,
  );

  const oauthEnv = {
    PENNYLANE_CLIENT_ID: "client-id",
    PENNYLANE_CLIENT_SECRET: "client-secret",
    PENNYLANE_OAUTH_REDIRECT_URI: "https://app.test/settings/integrations/pennylane/callback",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INTEGRATIONS_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    delete process.env.PENNYLANE_CLIENT_ID;
    delete process.env.PENNYLANE_CLIENT_SECRET;
    delete process.env.PENNYLANE_OAUTH_REDIRECT_URI;
    delete process.env.APP_URL;
  });

  describe("getPennylaneStatus", () => {
    it("returns disconnected when no credential", async () => {
      credentialModel.findOne.mockReturnValue({ exec: async () => null });
      await expect(service.getPennylaneStatus("org-1")).resolves.toEqual({
        provider: "pennylane",
        connected: false,
        oauthAvailable: false,
      });
    });

    it("flags oauthAvailable when platform credentials are set", async () => {
      Object.assign(process.env, oauthEnv);
      credentialModel.findOne.mockReturnValue({ exec: async () => null });
      await expect(service.getPennylaneStatus("org-1")).resolves.toMatchObject({
        connected: false,
        oauthAvailable: true,
      });
    });
  });

  describe("startPennylaneOAuth", () => {
    it("requires OAuth config", async () => {
      await expect(service.startPennylaneOAuth("org-1")).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it("returns authorize URL with state", async () => {
      Object.assign(process.env, oauthEnv);
      const { authorizationUrl } = await service.startPennylaneOAuth("org-1");
      const url = new URL(authorizationUrl);
      expect(url.origin + url.pathname).toBe("https://app.pennylane.com/oauth/authorize");
      expect(url.searchParams.get("client_id")).toBe("client-id");
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("redirect_uri")).toContain(
        "/settings/integrations/pennylane/callback",
      );
      expect(url.searchParams.get("state")).toBeTruthy();
      expect(url.searchParams.get("scope")).toContain("customer_invoices:all");
    });
  });

  describe("completePennylaneOAuth", () => {
    it("exchanges code and stores oauth credentials", async () => {
      Object.assign(process.env, oauthEnv);
      const state = signOAuthState("org-1");

      httpService.post.mockReturnValue(
        of({
          data: {
            access_token: "access-abc",
            refresh_token: "refresh-xyz",
            expires_in: 3600,
          },
          status: 200,
        }) as never,
      );
      httpService.get.mockReturnValue(
        of({ data: { id: 7, name: "Société OAuth" }, status: 200 }) as never,
      );
      credentialModel.findOneAndUpdate.mockReturnValue({ exec: async () => ({}) });
      credentialModel.findOne.mockReturnValue({
        exec: async () => ({
          companyId: "7",
          companyName: "Société OAuth",
          tokenHint: "••••-abc",
          authMethod: "oauth",
          connectedAt: new Date("2026-01-01T00:00:00Z"),
        }),
      });

      const status = await service.completePennylaneOAuth({
        organizationId: "org-1",
        code: "auth-code",
        state,
      });

      expect(httpService.post).toHaveBeenCalled();
      expect(credentialModel.findOneAndUpdate).toHaveBeenCalledWith(
        { organizationId: "org-1", provider: "pennylane" },
        expect.objectContaining({ authMethod: "oauth" }),
        expect.any(Object),
      );
      expect(status.connected).toBe(true);
      expect(status.authMethod).toBe("oauth");
      expect(status.oauthAvailable).toBe(true);
    });

    it("rejects state for another organization", async () => {
      Object.assign(process.env, oauthEnv);
      const state = signOAuthState("other-org");
      await expect(
        service.completePennylaneOAuth({
          organizationId: "org-1",
          code: "code",
          state,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("connectPennylane", () => {
    it("rejects empty token", async () => {
      await expect(
        service.connectPennylane({ organizationId: "org-1", apiToken: "  " }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("stores credential after /me succeeds", async () => {
      httpService.get.mockReturnValue(
        of({ data: { id: 42, name: "Ma société" }, status: 200 }) as never,
      );
      credentialModel.findOneAndUpdate.mockReturnValue({
        exec: async () => ({}),
      });
      credentialModel.findOne.mockReturnValue({
        exec: async () => ({
          companyId: "42",
          companyName: "Ma société",
          tokenHint: "••••oken",
          authMethod: "api_token",
          connectedAt: new Date("2026-01-01T00:00:00Z"),
        }),
      });

      const status = await service.connectPennylane({
        organizationId: "org-1",
        apiToken: "secret-token",
      });

      expect(httpService.get).toHaveBeenCalled();
      expect(credentialModel.findOneAndUpdate).toHaveBeenCalled();
      expect(status.connected).toBe(true);
      expect(status.companyName).toBe("Ma société");
    });
  });

  describe("syncCaseToPennylane", () => {
    it("requires lines", async () => {
      await expect(
        service.syncCaseToPennylane({
          organizationId: "org-1",
          caseId: "c1",
          caseTitle: "T",
          externalReference: "ref",
          invoiceDate: "2026-07-18",
          customer: { planwiseCustomerId: "cust", name: "Client" },
          lines: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("requires connected pennylane", async () => {
      syncModel.findOne.mockReturnValue({ exec: async () => null });
      credentialModel.findOne.mockReturnValue({ exec: async () => null });
      await expect(
        service.syncCaseToPennylane({
          organizationId: "org-1",
          caseId: "c1",
          caseTitle: "T",
          externalReference: "ref",
          invoiceDate: "2026-07-18",
          customer: { planwiseCustomerId: "cust", name: "Client" },
          lines: [{ label: "Ligne", quantity: 1, unitPriceHt: "10.00", vatRate: "FR_200" }],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns existing sync without calling Pennylane again", async () => {
      syncModel.findOne.mockReturnValue({
        exec: async () => ({
          pennylaneCustomerId: "9",
          pennylaneInvoiceId: "77",
          draft: true,
          invoiceUrl: "https://example.com/i/77",
        }),
      });

      const result = await service.syncCaseToPennylane({
        organizationId: "org-1",
        caseId: "c1",
        caseTitle: "T",
        externalReference: "ref",
        invoiceDate: "2026-07-18",
        customer: { planwiseCustomerId: "cust", name: "Client" },
        lines: [{ label: "Ligne", quantity: 1, unitPriceHt: "10.00", vatRate: "FR_200" }],
      });

      expect(result.pennylaneInvoiceId).toBe("77");
      expect(httpService.post).not.toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("deletes credential", async () => {
      credentialModel.findOne.mockReturnValue({
        exec: async () => ({ authMethod: "api_token", encryptedToken: "x" }),
      });
      credentialModel.deleteOne.mockReturnValue({ exec: async () => ({ deletedCount: 1 }) });
      await expect(service.disconnectPennylane("org-1")).resolves.toEqual({
        provider: "pennylane",
        connected: false,
        oauthAvailable: false,
      });
    });
  });
});
