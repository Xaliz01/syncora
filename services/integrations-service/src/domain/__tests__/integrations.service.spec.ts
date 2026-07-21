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
    updateOne: jest.fn(),
  };
  const syncModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };
  const httpService = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
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
    delete process.env.INVOICE_SYNC_BATCH_SIZE;
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
      credentialModel.deleteOne.mockReturnValue({ exec: async () => ({ deletedCount: 0 }) });
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
      expect(credentialModel.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "qonto" }),
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
      credentialModel.deleteOne.mockReturnValue({ exec: async () => ({ deletedCount: 0 }) });
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
      expect(credentialModel.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "qonto" }),
      );
      expect(status.connected).toBe(true);
      expect(status.companyName).toBe("Ma société");
    });

    it("disconnects Qonto when connecting Pennylane", async () => {
      httpService.get.mockReturnValue(of({ data: { id: 1, name: "Org" }, status: 200 }) as never);
      credentialModel.findOneAndUpdate.mockReturnValue({ exec: async () => ({}) });
      credentialModel.deleteOne.mockReturnValue({ exec: async () => ({ deletedCount: 1 }) });
      credentialModel.findOne.mockReturnValue({
        exec: async () => ({
          companyId: "1",
          companyName: "Org",
          tokenHint: "••••oken",
          authMethod: "api_token",
          connectedAt: new Date(),
        }),
      });

      await service.connectPennylane({ organizationId: "org-1", apiToken: "token" });

      expect(credentialModel.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-1", provider: "qonto" }),
      );
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

    it("creates a new Pennylane invoice even when a sync already exists", async () => {
      process.env.INTEGRATIONS_ENCRYPTION_KEY =
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const { encryptSecret } = await import("../secret-crypto");
      credentialModel.findOne.mockReturnValue({
        exec: async () => ({
          authMethod: "api_token",
          encryptedToken: encryptSecret("token"),
        }),
      });
      httpService.get.mockReturnValue(
        of({
          data: { customers: [{ id: 9, external_reference: "planwise-customer-cust" }] },
          status: 200,
        }) as never,
      );
      httpService.post.mockReturnValue(
        of({ data: { id: 88, public_url: "https://example.com/i/88" }, status: 200 }) as never,
      );
      syncModel.create.mockResolvedValue({ _id: "sync-new" });

      const result = await service.syncCaseToPennylane({
        organizationId: "org-1",
        caseId: "c1",
        caseTitle: "T",
        externalReference: "ref-2",
        invoiceDate: "2026-07-18",
        customer: { planwiseCustomerId: "cust", name: "Client" },
        lines: [{ label: "Ligne", quantity: 1, unitPriceHt: "10.00", vatRate: "FR_200" }],
        invoiceKind: "situation",
        situationNumber: 2,
        amountHt: "10.00",
      });

      expect(result.pennylaneInvoiceId).toBe("88");
      expect(result.syncId).toBe("sync-new");
      expect(syncModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceKind: "situation",
          situationNumber: 2,
          amountHt: "10.00",
        }),
      );
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

  describe("Qonto", () => {
    const qontoOauthEnv = {
      QONTO_CLIENT_ID: "qonto-client",
      QONTO_CLIENT_SECRET: "qonto-secret",
      QONTO_OAUTH_REDIRECT_URI: "https://app.test/settings/integrations/qonto/callback",
    };

    beforeEach(() => {
      delete process.env.QONTO_CLIENT_ID;
      delete process.env.QONTO_CLIENT_SECRET;
      delete process.env.QONTO_OAUTH_REDIRECT_URI;
      delete process.env.QONTO_STAGING_TOKEN;
    });

    describe("getQontoStatus", () => {
      it("returns disconnected when no credential", async () => {
        credentialModel.findOne.mockReturnValue({ exec: async () => null });
        await expect(service.getQontoStatus("org-1")).resolves.toEqual({
          provider: "qonto",
          connected: false,
          oauthAvailable: false,
        });
      });

      it("flags oauthAvailable when platform credentials are set", async () => {
        Object.assign(process.env, qontoOauthEnv);
        credentialModel.findOne.mockReturnValue({ exec: async () => null });
        await expect(service.getQontoStatus("org-1")).resolves.toMatchObject({
          connected: false,
          oauthAvailable: true,
        });
      });
    });

    describe("startQontoOAuth", () => {
      it("requires OAuth config", async () => {
        await expect(service.startQontoOAuth("org-1")).rejects.toBeInstanceOf(
          ServiceUnavailableException,
        );
      });

      it("returns authorize URL with state", async () => {
        Object.assign(process.env, qontoOauthEnv);
        const { authorizationUrl } = await service.startQontoOAuth("org-1");
        const url = new URL(authorizationUrl);
        expect(url.origin + url.pathname).toBe("https://oauth.qonto.com/oauth2/auth");
        expect(url.searchParams.get("client_id")).toBe("qonto-client");
        expect(url.searchParams.get("response_type")).toBe("code");
        expect(url.searchParams.get("redirect_uri")).toContain(
          "/settings/integrations/qonto/callback",
        );
        expect(url.searchParams.get("state")).toBeTruthy();
        expect(url.searchParams.get("scope")).toContain("organization.read");
      });
    });

    describe("completeQontoOAuth", () => {
      it("exchanges code and stores oauth credentials", async () => {
        Object.assign(process.env, qontoOauthEnv);
        const state = signOAuthState("org-1");

        httpService.post.mockReturnValue(
          of({
            data: {
              access_token: "qonto-access",
              refresh_token: "qonto-refresh",
              expires_in: 3600,
            },
            status: 200,
          }) as never,
        );
        httpService.get.mockReturnValue(
          of({
            data: { organization: { id: "org-q", name: "Société Qonto" } },
            status: 200,
          }) as never,
        );
        credentialModel.findOneAndUpdate.mockReturnValue({ exec: async () => ({}) });
        credentialModel.deleteOne.mockReturnValue({ exec: async () => ({ deletedCount: 0 }) });
        credentialModel.findOne.mockReturnValue({
          exec: async () => ({
            companyId: "org-q",
            companyName: "Société Qonto",
            tokenHint: "••••cess",
            authMethod: "oauth",
            connectedAt: new Date("2026-01-01T00:00:00Z"),
          }),
        });

        const status = await service.completeQontoOAuth({
          organizationId: "org-1",
          code: "auth-code",
          state,
        });

        expect(httpService.post).toHaveBeenCalled();
        expect(credentialModel.findOneAndUpdate).toHaveBeenCalledWith(
          { organizationId: "org-1", provider: "qonto" },
          expect.objectContaining({ authMethod: "oauth" }),
          expect.any(Object),
        );
        expect(credentialModel.deleteOne).toHaveBeenCalledWith(
          expect.objectContaining({ provider: "pennylane" }),
        );
        expect(status.connected).toBe(true);
        expect(status.authMethod).toBe("oauth");
        expect(status.oauthAvailable).toBe(true);
      });

      it("rejects state for another organization", async () => {
        Object.assign(process.env, qontoOauthEnv);
        const state = signOAuthState("other-org");
        await expect(
          service.completeQontoOAuth({
            organizationId: "org-1",
            code: "code",
            state,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    describe("connectQonto", () => {
      it("rejects missing credentials", async () => {
        await expect(
          service.connectQonto({ organizationId: "org-1", login: " ", secretKey: "key" }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it("stores credential after /organization succeeds", async () => {
        httpService.get.mockReturnValue(
          of({
            data: { organization: { id: "q1", name: "Banque Qonto" } },
            status: 200,
          }) as never,
        );
        credentialModel.findOneAndUpdate.mockReturnValue({ exec: async () => ({}) });
        credentialModel.deleteOne.mockReturnValue({ exec: async () => ({ deletedCount: 0 }) });
        credentialModel.findOne.mockReturnValue({
          exec: async () => ({
            companyId: "q1",
            companyName: "Banque Qonto",
            tokenHint: "••••cret",
            authMethod: "api_token",
            connectedAt: new Date("2026-01-01T00:00:00Z"),
          }),
        });

        const status = await service.connectQonto({
          organizationId: "org-1",
          login: "qonto-login",
          secretKey: "secret-key",
        });

        expect(httpService.get).toHaveBeenCalledWith(
          expect.stringContaining("/organization"),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "qonto-login:secret-key",
            }),
          }),
        );
        expect(credentialModel.findOneAndUpdate).toHaveBeenCalled();
        expect(credentialModel.deleteOne).toHaveBeenCalledWith(
          expect.objectContaining({ provider: "pennylane" }),
        );
        expect(status.connected).toBe(true);
        expect(status.companyName).toBe("Banque Qonto");
      });

      it("disconnects Pennylane when connecting Qonto", async () => {
        httpService.get.mockReturnValue(
          of({
            data: { organization: { id: "q1", name: "Org" } },
            status: 200,
          }) as never,
        );
        credentialModel.findOneAndUpdate.mockReturnValue({ exec: async () => ({}) });
        credentialModel.deleteOne.mockReturnValue({ exec: async () => ({ deletedCount: 1 }) });
        credentialModel.findOne
          .mockReturnValueOnce({
            exec: async () => ({
              authMethod: "api_token",
              encryptedToken: "enc",
            }),
          })
          .mockReturnValue({
            exec: async () => ({
              companyId: "q1",
              companyName: "Org",
              tokenHint: "••••cret",
              authMethod: "api_token",
              connectedAt: new Date(),
            }),
          });

        await service.connectQonto({
          organizationId: "org-1",
          login: "login",
          secretKey: "secret",
        });

        expect(credentialModel.deleteOne).toHaveBeenCalledWith(
          expect.objectContaining({ organizationId: "org-1", provider: "pennylane" }),
        );
      });

      it("sends X-Qonto-Staging-Token when configured", async () => {
        process.env.QONTO_STAGING_TOKEN = "staging-token-xyz";
        httpService.get.mockReturnValue(
          of({
            data: { organization: { id: "q1", name: "Sandbox Org" } },
            status: 200,
          }) as never,
        );
        credentialModel.findOneAndUpdate.mockReturnValue({ exec: async () => ({}) });
        credentialModel.deleteOne.mockReturnValue({ exec: async () => ({ deletedCount: 0 }) });
        credentialModel.findOne.mockReturnValue({
          exec: async () => ({
            companyId: "q1",
            companyName: "Sandbox Org",
            tokenHint: "••••cret",
            authMethod: "api_token",
            connectedAt: new Date("2026-01-01T00:00:00Z"),
          }),
        });

        await service.connectQonto({
          organizationId: "org-1",
          login: "login",
          secretKey: "secret",
        });

        expect(httpService.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              "X-Qonto-Staging-Token": "staging-token-xyz",
            }),
          }),
        );
        delete process.env.QONTO_STAGING_TOKEN;
      });
    });

    describe("disconnectQonto", () => {
      it("deletes credential", async () => {
        credentialModel.deleteOne.mockReturnValue({ exec: async () => ({ deletedCount: 1 }) });
        await expect(service.disconnectQonto("org-1")).resolves.toEqual({
          provider: "qonto",
          connected: false,
          oauthAvailable: false,
        });
      });
    });

    describe("syncCaseToQonto", () => {
      it("requires lines", async () => {
        await expect(
          service.syncCaseToQonto({
            organizationId: "org-1",
            caseId: "c1",
            caseTitle: "T",
            externalReference: "ref",
            invoiceDate: "2026-07-18",
            customer: {
              planwiseCustomerId: "cust",
              kind: "company",
              name: "Client",
            },
            lines: [],
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it("requires connected qonto", async () => {
        syncModel.findOne.mockReturnValue({ exec: async () => null });
        credentialModel.findOne.mockReturnValue({ exec: async () => null });
        await expect(
          service.syncCaseToQonto({
            organizationId: "org-1",
            caseId: "c1",
            caseTitle: "T",
            externalReference: "ref",
            invoiceDate: "2026-07-18",
            customer: {
              planwiseCustomerId: "cust",
              kind: "company",
              name: "Client",
              email: "client@example.com",
              legalIdentifier: "123456789",
            },
            lines: [{ label: "Ligne", quantity: 1, unitPriceHt: "10.00", vatRate: "0.20" }],
          }),
        ).rejects.toBeInstanceOf(NotFoundException);
      });

      it("requires client tax id (SIREN/SIRET) for companies", async () => {
        syncModel.findOne.mockReturnValue({ exec: async () => null });
        await expect(
          service.syncCaseToQonto({
            organizationId: "org-1",
            caseId: "c1",
            caseTitle: "T",
            externalReference: "ref",
            invoiceDate: "2026-07-18",
            customer: {
              planwiseCustomerId: "cust",
              kind: "company",
              name: "Client",
              email: "client@example.com",
            },
            lines: [{ label: "Ligne", quantity: 1, unitPriceHt: "10.00", vatRate: "0.20" }],
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(credentialModel.findOne).not.toHaveBeenCalled();
      });

      it("allows individual customers without SIREN/SIRET", async () => {
        process.env.INTEGRATIONS_ENCRYPTION_KEY =
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        const { encryptSecret } = await import("../secret-crypto");
        syncModel.findOne.mockReturnValue({ exec: async () => null });
        credentialModel.findOne.mockReturnValue({
          exec: async () => ({
            authMethod: "api_token",
            encryptedToken: encryptSecret("login:secret"),
          }),
        });
        httpService.get
          .mockReturnValueOnce(of({ data: { clients: [] }, status: 200 }) as never)
          .mockReturnValueOnce(
            of({
              data: {
                organization: {
                  bank_accounts: [{ iban: "FR7616958000010123456789037", main: true }],
                },
              },
              status: 200,
            }) as never,
          );
        httpService.post
          .mockReturnValueOnce(of({ data: { client: { id: "indiv-uuid" } }, status: 200 }) as never)
          .mockReturnValueOnce(
            of({
              data: { client_invoice: { id: "inv-indiv", status: "draft" } },
              status: 201,
            }) as never,
          );
        syncModel.create.mockResolvedValue({ _id: "sync-indiv" });

        await expect(
          service.syncCaseToQonto({
            organizationId: "org-1",
            caseId: "c2",
            caseTitle: "Dépannage",
            externalReference: "planwise-case-c2",
            invoiceDate: "2026-07-18",
            customer: {
              planwiseCustomerId: "cust-2",
              kind: "individual",
              name: "Jean Dupont",
              firstName: "Jean",
              lastName: "Dupont",
              email: "jean@example.com",
              addressLine1: "2 rue Test",
              postalCode: "69001",
              city: "Lyon",
              country: "FR",
            },
            lines: [{ label: "Intervention", quantity: 1, unitPriceHt: "80.00", vatRate: "0.20" }],
          }),
        ).resolves.toMatchObject({
          qontoCustomerId: "indiv-uuid",
          qontoInvoiceId: "inv-indiv",
        });

        expect(httpService.post).toHaveBeenCalledWith(
          expect.stringContaining("/clients"),
          expect.objectContaining({
            kind: "individual",
            first_name: "Jean",
            last_name: "Dupont",
          }),
          expect.any(Object),
        );
        const clientPayload = httpService.post.mock.calls.find((call) =>
          String(call[0]).includes("/clients"),
        )?.[1] as Record<string, unknown> | undefined;
        expect(clientPayload?.tax_identification_number).toBeUndefined();
      });

      it("creates draft invoice and stores sync", async () => {
        process.env.INTEGRATIONS_ENCRYPTION_KEY =
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        const { encryptSecret } = await import("../secret-crypto");
        syncModel.findOne.mockReturnValue({ exec: async () => null });
        credentialModel.findOne.mockReturnValue({
          exec: async () => ({
            authMethod: "api_token",
            encryptedToken: encryptSecret("login:secret"),
          }),
        });
        httpService.get
          .mockReturnValueOnce(
            of({
              data: { clients: [] },
              status: 200,
            }) as never,
          )
          .mockReturnValueOnce(
            of({
              data: {
                organization: {
                  bank_accounts: [{ iban: "FR7616958000010123456789037", main: true }],
                },
              },
              status: 200,
            }) as never,
          );
        httpService.post
          .mockReturnValueOnce(
            of({
              data: { client: { id: "client-uuid" } },
              status: 200,
            }) as never,
          )
          .mockReturnValueOnce(
            of({
              data: {
                client_invoice: {
                  id: "inv-uuid",
                  status: "draft",
                  invoice_url: "https://qonto.test/i/inv",
                },
              },
              status: 201,
            }) as never,
          );
        syncModel.create.mockResolvedValue({ _id: "sync-draft" });

        const result = await service.syncCaseToQonto({
          organizationId: "org-1",
          caseId: "c1",
          caseTitle: "Chantier toit",
          externalReference: "planwise-case-c1",
          invoiceDate: "2026-07-18",
          customer: {
            planwiseCustomerId: "cust",
            kind: "company",
            name: "ACME",
            email: "billing@acme.test",
            legalIdentifier: "123456789",
            addressLine1: "1 rue Test",
            postalCode: "75001",
            city: "Paris",
            country: "FR",
          },
          lines: [{ label: "Prestation", quantity: 2, unitPriceHt: "100.00", vatRate: "0.20" }],
          draft: true,
        });

        expect(result).toEqual({
          provider: "qonto",
          caseId: "c1",
          syncId: "sync-draft",
          qontoCustomerId: "client-uuid",
          qontoInvoiceId: "inv-uuid",
          draft: true,
          invoiceUrl: "https://qonto.test/i/inv",
        });
        expect(httpService.post).toHaveBeenCalledWith(
          expect.stringContaining("/client_invoices"),
          expect.objectContaining({
            client_id: "client-uuid",
          }),
          expect.any(Object),
        );
        const invoicePayload = httpService.post.mock.calls.find((call) =>
          String(call[0]).includes("/client_invoices"),
        )?.[1] as Record<string, unknown> | undefined;
        expect(invoicePayload?.number).toBeUndefined();
        expect(syncModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: "qonto",
            caseId: "c1",
            providerCustomerId: "client-uuid",
            providerInvoiceId: "inv-uuid",
            draft: true,
          }),
        );
      });

      it("sends invoice number when provided", async () => {
        process.env.INTEGRATIONS_ENCRYPTION_KEY =
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        const { encryptSecret } = await import("../secret-crypto");
        syncModel.findOne.mockReturnValue({ exec: async () => null });
        credentialModel.findOne.mockReturnValue({
          exec: async () => ({
            authMethod: "api_token",
            encryptedToken: encryptSecret("login:secret"),
          }),
        });
        httpService.get.mockReturnValueOnce(
          of({
            data: {
              organization: {
                bank_accounts: [{ iban: "FR7616958000010123456789037", main: true }],
              },
            },
            status: 200,
          }) as never,
        );
        httpService.post
          .mockReturnValueOnce(
            of({
              data: { client: { id: "client-uuid" } },
              status: 200,
            }) as never,
          )
          .mockReturnValueOnce(
            of({
              data: {
                client_invoice: {
                  id: "inv-uuid",
                  status: "draft",
                  invoice_url: "https://qonto.test/i/inv",
                },
              },
              status: 201,
            }) as never,
          );
        syncModel.create.mockResolvedValue({ _id: "sync-indiv" });

        await service.syncCaseToQonto({
          organizationId: "org-1",
          caseId: "c1",
          caseTitle: "Chantier",
          externalReference: "ref",
          invoiceDate: "2026-07-18",
          customer: {
            planwiseCustomerId: "cust",
            kind: "company",
            name: "ACME",
            legalIdentifier: "123456789",
          },
          lines: [{ label: "Prestation", quantity: 1, unitPriceHt: "50.00", vatRate: "0.20" }],
          invoiceNumber: "FAC-2026-042",
        });

        const invoicePayload = httpService.post.mock.calls.find((call) =>
          String(call[0]).includes("/client_invoices"),
        )?.[1] as Record<string, unknown> | undefined;
        expect(invoicePayload?.number).toBe("FAC-2026-042");
      });

      it("creates a new Qonto invoice even when a sync already exists", async () => {
        process.env.INTEGRATIONS_ENCRYPTION_KEY =
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        const { encryptSecret } = await import("../secret-crypto");
        credentialModel.findOne.mockReturnValue({
          exec: async () => ({
            authMethod: "api_token",
            encryptedToken: encryptSecret("login:secret"),
          }),
        });
        httpService.get.mockReturnValue(
          of({
            data: {
              organization: {
                bank_accounts: [{ iban: "FR7616958000010123456789037", main: true }],
              },
            },
            status: 200,
          }) as never,
        );
        httpService.post
          .mockReturnValueOnce(of({ data: { client: { id: "client-1" } }, status: 200 }) as never)
          .mockReturnValueOnce(
            of({
              data: { client_invoice: { id: "inv-new", status: "draft" } },
              status: 201,
            }) as never,
          );
        syncModel.create.mockResolvedValue({ _id: "sync-qonto-2" });

        const result = await service.syncCaseToQonto({
          organizationId: "org-1",
          caseId: "c1",
          caseTitle: "T",
          externalReference: "ref-2",
          invoiceDate: "2026-07-18",
          customer: {
            planwiseCustomerId: "cust",
            kind: "company",
            name: "Client",
            legalIdentifier: "123456789",
          },
          lines: [{ label: "Ligne", quantity: 1, unitPriceHt: "10.00", vatRate: "0.20" }],
        });

        expect(result.qontoInvoiceId).toBe("inv-new");
        expect(result.syncId).toBe("sync-qonto-2");
        expect(syncModel.create).toHaveBeenCalled();
      });
    });

    describe("case invoice sync lifecycle", () => {
      it("returns an empty list when no sync exists", async () => {
        syncModel.find.mockReturnValue({
          sort: () => ({ exec: async () => [] }),
        });
        await expect(service.getCaseInvoiceSync("org-1", "c1")).resolves.toEqual({ invoices: [] });
      });

      it("finalizes a Qonto draft invoice", async () => {
        process.env.INTEGRATIONS_ENCRYPTION_KEY =
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        const { encryptSecret } = await import("../secret-crypto");
        const doc = {
          _id: "sync-1",
          organizationId: "org-1",
          provider: "qonto",
          caseId: "c1",
          providerCustomerId: "client-1",
          providerInvoiceId: "inv-1",
          draft: true,
          remoteStatus: "draft",
          invoiceKind: "full",
          save: jest.fn().mockResolvedValue(undefined),
        };
        syncModel.findOne.mockReturnValue({ exec: async () => doc });
        credentialModel.findOne.mockReturnValue({
          exec: async () => ({
            authMethod: "api_token",
            encryptedToken: encryptSecret("login:secret"),
          }),
        });
        httpService.post.mockReturnValue(
          of({
            data: {
              client_invoice: {
                id: "inv-1",
                status: "unpaid",
                number: "FAC-1",
                invoice_url: "https://qonto.test/i/1",
              },
            },
            status: 200,
          }) as never,
        );

        const status = await service.finalizeCaseInvoice("org-1", "c1", "sync-1");
        expect(httpService.post).toHaveBeenCalledWith(
          expect.stringContaining("/client_invoices/inv-1/finalize"),
          {},
          expect.any(Object),
        );
        expect(status.remoteStatus).toBe("finalized");
        expect(status.draft).toBe(false);
        expect(status.invoiceNumber).toBe("FAC-1");
        expect(status.id).toBe("sync-1");
        expect(doc.save).toHaveBeenCalled();
      });

      it("refreshes a Pennylane invoice status", async () => {
        process.env.INTEGRATIONS_ENCRYPTION_KEY =
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        const { encryptSecret } = await import("../secret-crypto");
        const doc = {
          _id: "sync-pl",
          organizationId: "org-1",
          provider: "pennylane",
          caseId: "c1",
          providerCustomerId: "42",
          providerInvoiceId: "99",
          draft: false,
          remoteStatus: "finalized",
          invoiceKind: "full",
          save: jest.fn().mockResolvedValue(undefined),
        };
        syncModel.findOne.mockReturnValue({ exec: async () => doc });
        credentialModel.findOne.mockReturnValue({
          exec: async () => ({
            authMethod: "api_token",
            encryptedToken: encryptSecret("token"),
          }),
        });
        httpService.get.mockImplementation(
          () =>
            of({
              data: {
                id: 99,
                draft: false,
                paid: true,
                status: "paid",
                invoice_number: "F-99",
                public_url: "https://pennylane.test/i/99",
              },
              status: 200,
            }) as never,
        );

        const status = await service.refreshCaseInvoiceSync("org-1", "c1", "sync-pl");
        expect(status.remoteStatus).toBe("paid");
        expect(status.invoiceNumber).toBe("F-99");
        expect(doc.save).toHaveBeenCalled();
      });

      it("detaches a cancelled invoice sync", async () => {
        const doc = {
          _id: "sync-cancel",
          organizationId: "org-1",
          provider: "qonto",
          caseId: "c1",
          providerCustomerId: "client-1",
          providerInvoiceId: "inv-c",
          draft: false,
          remoteStatus: "cancelled",
          invoiceKind: "full",
        };
        syncModel.findOne.mockReturnValue({ exec: async () => doc });
        syncModel.deleteOne.mockReturnValue({ exec: async () => ({ deletedCount: 1 }) });
        syncModel.find.mockReturnValue({
          sort: () => ({ exec: async () => [] }),
        });

        const list = await service.deleteCaseInvoiceSync("org-1", "c1", "sync-cancel");
        expect(syncModel.deleteOne).toHaveBeenCalled();
        expect(list).toEqual({ invoices: [] });
      });

      it("refuses to detach a finalized invoice", async () => {
        syncModel.findOne.mockReturnValue({
          exec: async () => ({
            _id: "sync-ok",
            remoteStatus: "finalized",
            draft: false,
          }),
        });
        await expect(
          service.deleteCaseInvoiceSync("org-1", "c1", "sync-ok"),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it("refreshes pending syncs oldest-first within the batch limit", async () => {
        process.env.INTEGRATIONS_ENCRYPTION_KEY =
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        process.env.INVOICE_SYNC_BATCH_SIZE = "50";
        const { encryptSecret } = await import("../secret-crypto");

        const limit = jest.fn().mockReturnValue({
          exec: async () => [
            {
              _id: "sync-old",
              organizationId: "org-1",
              provider: "qonto",
              caseId: "c1",
              providerCustomerId: "client-1",
              providerInvoiceId: "inv-old",
              draft: false,
              remoteStatus: "finalized",
              invoiceKind: "full",
              lastSyncedAt: new Date("2026-01-01"),
              save: jest.fn().mockResolvedValue(undefined),
            },
          ],
        });
        const sort = jest.fn().mockReturnValue({ limit });
        syncModel.find.mockReturnValue({ sort });

        credentialModel.findOne.mockReturnValue({
          exec: async () => ({
            authMethod: "api_token",
            encryptedToken: encryptSecret("login:secret"),
          }),
        });
        httpService.get.mockReturnValue(
          of({
            data: {
              client_invoice: {
                id: "inv-old",
                status: "paid",
                number: "FAC-OLD",
              },
            },
            status: 200,
          }) as never,
        );

        const result = await service.refreshPendingInvoiceSyncs();

        expect(sort).toHaveBeenCalledWith({ lastSyncedAt: 1, _id: 1 });
        expect(limit).toHaveBeenCalledWith(50);
        expect(result.refreshed).toBe(1);
        expect(result.updated[0]?.remoteStatus).toBe("paid");
        delete process.env.INVOICE_SYNC_BATCH_SIZE;
      });
    });
  });
});
