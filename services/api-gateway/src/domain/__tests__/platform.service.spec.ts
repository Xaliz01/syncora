import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { of, throwError } from "rxjs";
import { PLATFORM_CRON_JOBS } from "@planwise/shared";
import { PlatformService } from "../platform/platform.service";
import { PlatformAuthService } from "../platform/platform-auth.service";
import { PlatformDashboardService } from "../platform/platform-dashboard.service";
import { PlatformDirectoryService } from "../platform/platform-directory.service";
import { PlatformEmailTemplatesService } from "../platform/platform-email-templates.service";
import { PlatformIntegrationsCronsService } from "../platform/platform-integrations-crons.service";
import { PlatformOrgLookupService } from "../platform/platform-org-lookup.service";
import { PlatformProspectsService } from "../platform/platform-prospects.service";

describe("PlatformService", () => {
  const httpService = { get: jest.fn(), post: jest.fn() };
  const jwtService = { sign: jest.fn().mockReturnValue("platform-token") };
  const subscriptionsGateway = {
    getCurrentSubscription: jest.fn(),
    staffExtendTrial: jest.fn(),
  };
  const analyticsGateway = {
    trackPageview: jest.fn(),
    getOverview: jest.fn(),
    listLandingVisits: jest.fn(),
    listLandingToAppVisits: jest.fn(),
    listPathVisits: jest.fn(),
  };
  const prometheusOpsHealth = {
    getOpsHealth: jest.fn().mockResolvedValue({
      available: false,
      source: "unavailable",
      window: "5m",
      fetchedAt: new Date().toISOString(),
      services: [],
      summary: {
        upCount: 0,
        downCount: 0,
        unknownCount: 0,
        latencyMsAvg: null,
        latencyMsP95: null,
      },
    }),
  };

  let service: PlatformService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLATFORM_STAFF_EMAILS = "mail@benoistbabin.fr";
    process.env.PLATFORM_STAFF_EMAIL_DOMAINS = "planwise.fr";

    const http = httpService as never;
    const orgLookup = new PlatformOrgLookupService(http);
    const auth = new PlatformAuthService(http, jwtService as never);
    const directory = new PlatformDirectoryService(
      http,
      jwtService as never,
      subscriptionsGateway as never,
      orgLookup,
    );
    const integrationsCrons = new PlatformIntegrationsCronsService(http, orgLookup);
    const dashboard = new PlatformDashboardService(
      http,
      analyticsGateway as never,
      prometheusOpsHealth as never,
      orgLookup,
    );
    const emailTemplates = new PlatformEmailTemplatesService(http);
    const prospects = new PlatformProspectsService(http, emailTemplates);

    service = new PlatformService(
      auth,
      directory,
      integrationsCrons,
      dashboard,
      prospects,
      emailTemplates,
    );
  });

  it("rejects non-staff login", async () => {
    await expect(
      service.login({ email: "client@acme.fr", password: "secret" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it("issues a platform token for allowlisted staff", async () => {
    httpService.post.mockReturnValue(
      of({
        data: {
          id: "staff-1",
          email: "mail@benoistbabin.fr",
          name: "Benoist",
          status: "active",
        },
        status: 200,
      }),
    );

    const result = await service.login({
      email: "mail@benoistbabin.fr",
      password: "secret",
    });

    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "platform", sub: "staff-1" }),
      { expiresIn: "8h" },
    );
    expect(result.user.email).toBe("mail@benoistbabin.fr");
    expect(result.accessToken).toBe("platform-token");
  });

  it("creates an audited impersonation session", async () => {
    httpService.get
      .mockReturnValueOnce(
        of({
          data: {
            id: "user-1",
            email: "client@acme.fr",
            organizationId: "org-1",
            role: "admin",
            status: "active",
            name: "Client",
          },
        }),
      )
      .mockReturnValueOnce(
        of({
          data: [
            {
              id: "m1",
              userId: "user-1",
              organizationId: "org-1",
              role: "admin",
              membershipStatus: "active",
            },
          ],
        }),
      );
    httpService.post.mockReturnValue(of({ data: { id: "audit-1" } }));
    jwtService.sign.mockReturnValue("impersonation-token");

    const result = await service.startImpersonation(
      { id: "staff-1", email: "mail@benoistbabin.fr" },
      {
        userId: "user-1",
        organizationId: "org-1",
        reason: "Ticket support #123 — accès facture",
      },
    );

    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining("/users/platform/impersonation-audits"),
      expect.objectContaining({
        impersonatorUserId: "staff-1",
        targetUserId: "user-1",
        reason: "Ticket support #123 — accès facture",
      }),
    );
    expect(result.user.impersonatorId).toBe("staff-1");
    expect(result.accessToken).toBe("impersonation-token");
  });

  it("rejects short impersonation reasons", async () => {
    await expect(
      service.startImpersonation(
        { id: "staff-1", email: "mail@benoistbabin.fr" },
        { userId: "u1", organizationId: "o1", reason: "court" },
      ),
    ).rejects.toThrow(/motif support/i);
  });

  it("merges cron runs across services with real total and offset", async () => {
    httpService.get.mockImplementation(
      (_url: string, config?: { params?: { jobKey?: string } }) => {
        const jobKey = config?.params?.jobKey;
        if (jobKey === "notifications.intervention-reminders") {
          return of({
            data: {
              total: 89,
              runs: Array.from({ length: 50 }, (_, i) => ({
                id: `n-${i}`,
                jobKey,
                service: "notifications-service",
                status: "ok",
                startedAt: new Date(2026, 6, 21, 12, 50 - i).toISOString(),
              })),
            },
          });
        }
        if (jobKey === "integrations.invoice-sync") {
          return of({
            data: {
              total: 10,
              runs: Array.from({ length: 10 }, (_, i) => ({
                id: `i-${i}`,
                jobKey,
                service: "integrations-service",
                status: "ok",
                startedAt: new Date(2026, 6, 21, 11, 10 - i).toISOString(),
              })),
            },
          });
        }
        return of({
          data: {
            total: 5,
            runs: Array.from({ length: 5 }, (_, i) => ({
              id: `o-${i}`,
              jobKey: jobKey ?? "organizations.trial-test-data-cleanup",
              service: "organizations-service",
              status: "ok",
              startedAt: new Date(2026, 6, 20, 4, i).toISOString(),
            })),
          },
        });
      },
    );

    const expectedTotal =
      89 + 10 + (PLATFORM_CRON_JOBS.length - 2) * 5; /* 5 runs par défaut pour chaque autre job */

    const page1 = await service.listCronRuns({ limit: 50, offset: 0 });
    expect(page1.total).toBe(expectedTotal);
    expect(page1.runs).toHaveLength(50);

    const page2 = await service.listCronRuns({ limit: 50, offset: 50 });
    expect(page2.total).toBe(expectedTotal);
    expect(page2.runs.length).toBeGreaterThan(0);
    expect(page2.runs[0]?.id).not.toBe(page1.runs[0]?.id);
  });

  it("staff-extends organization trial via subscriptions gateway", async () => {
    subscriptionsGateway.staffExtendTrial.mockResolvedValue({
      status: "trialing",
      planName: "Essentiel",
      hasAccess: true,
      trialEndsAt: "2026-09-01T00:00:00.000Z",
      billingOpen: false,
      canExtendTrial: false,
      trialExtensionCount: 3,
      maxTrialExtensions: 2,
    });

    const result = await service.staffExtendOrganizationTrial("org-1");

    expect(subscriptionsGateway.staffExtendTrial).toHaveBeenCalledWith("org-1");
    expect(result).toMatchObject({
      status: "trialing",
      hasAccess: true,
      trialExtensionCount: 3,
    });
  });

  describe("prospects (Pappers)", () => {
    beforeEach(() => {
      process.env.PAPPERS_API_KEY = "test-pappers-key";
    });

    it("maps Pappers results and marks already contacted sirens", async () => {
      httpService.get.mockImplementation((url: string) => {
        if (String(url).includes("/recherche")) {
          return of({
            data: {
              total: 1,
              page: 1,
              resultats: [
                {
                  siren: "123456789",
                  nom_entreprise: "Plomberie Dupont",
                  code_naf: "43.22A",
                  libelle_code_naf: "Travaux de plomberie",
                  date_creation: "2026-01-15",
                  siege: { ville: "Lyon", code_postal: "69001", siret: "12345678900012" },
                  dirigeants: [{ prenoms: "Jean", nom: "Dupont" }],
                },
              ],
            },
          });
        }
        if (String(url).includes("prospect-outreaches")) {
          return of({
            data: {
              outreaches: [
                {
                  id: "o1",
                  siren: "123456789",
                  companyName: "Plomberie Dupont",
                  email: "jean@example.fr",
                  sentByUserId: "staff-1",
                  sentByEmail: "staff@planwise.fr",
                  subject: "Sujet",
                  status: "sent",
                  sentAt: "2026-07-01T00:00:00.000Z",
                },
              ],
            },
          });
        }
        if (String(url).includes("suivi-jetons")) {
          return of({ data: { jetons: 87.5 } });
        }
        return of({ data: {} });
      });

      const result = await service.searchProspects({ page: 1, perPage: 20 });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/recherche"),
        expect.objectContaining({
          params: expect.objectContaining({
            api_token: "test-pappers-key",
            entreprise_cessee: "false",
            date_creation_min: expect.stringMatching(/^\d{2}-\d{2}-\d{4}$/),
          }),
        }),
      );
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        siren: "123456789",
        name: "Plomberie Dupont",
        alreadyContacted: true,
        emailNotFound: false,
        city: "Lyon",
      });
      expect(result.creditsRemaining).toBe(87.5);
    });

    it("serves a second identical search from cache without calling Pappers again", async () => {
      httpService.get.mockImplementation((url: string) => {
        if (String(url).includes("/recherche")) {
          return of({
            data: {
              total: 1,
              page: 1,
              resultats: [
                {
                  siren: "123456789",
                  nom_entreprise: "Plomberie Dupont",
                  date_creation: "2026-01-15",
                },
              ],
            },
          });
        }
        if (String(url).includes("prospect-outreaches")) {
          return of({ data: { outreaches: [] } });
        }
        if (String(url).includes("suivi-jetons")) {
          return of({ data: { jetons: 80 } });
        }
        return of({ data: {} });
      });

      const first = await service.searchProspects({
        page: 1,
        perPage: 20,
        sort: "created_at_desc",
      });
      expect(first.fromCache).toBe(false);
      const rechercheCalls = httpService.get.mock.calls.filter((c) =>
        String(c[0]).includes("/recherche"),
      ).length;

      const second = await service.searchProspects({
        page: 1,
        perPage: 20,
        sort: "created_at_desc",
      });
      expect(second.fromCache).toBe(true);
      expect(second.results[0]?.siren).toBe("123456789");
      expect(
        httpService.get.mock.calls.filter((c) => String(c[0]).includes("/recherche")).length,
      ).toBe(rechercheCalls);
    });

    it("sorts the current page by creation date descending", async () => {
      httpService.get.mockImplementation((url: string) => {
        if (String(url).includes("/recherche")) {
          return of({
            data: {
              total: 2,
              page: 1,
              resultats: [
                {
                  siren: "111111111",
                  nom_entreprise: "Ancienne",
                  date_creation: "2025-09-01",
                },
                {
                  siren: "222222222",
                  nom_entreprise: "Recente",
                  date_creation: "2026-07-01",
                },
              ],
            },
          });
        }
        if (String(url).includes("prospect-outreaches")) {
          return of({ data: { outreaches: [] } });
        }
        if (String(url).includes("suivi-jetons")) {
          return of({ data: { jetons: 10 } });
        }
        return of({ data: {} });
      });

      const result = await service.searchProspects({
        page: 1,
        perPage: 20,
        sort: "created_at_desc",
        refresh: true,
      });

      expect(result.results.map((r) => r.siren)).toEqual(["222222222", "111111111"]);
      expect(result.sort).toBe("created_at_desc");
    });

    it("forwards a custom dateCreationMin to Pappers", async () => {
      httpService.get.mockImplementation((url: string) => {
        if (String(url).includes("/recherche")) {
          return of({ data: { total: 0, page: 1, resultats: [] } });
        }
        if (String(url).includes("prospect-outreaches")) {
          return of({ data: { outreaches: [] } });
        }
        if (String(url).includes("suivi-jetons")) {
          return of({ data: { jetons: 10 } });
        }
        return of({ data: {} });
      });

      await service.searchProspects({
        page: 1,
        perPage: 20,
        dateCreationMin: "2026-06-01",
        refresh: true,
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/recherche"),
        expect.objectContaining({
          params: expect.objectContaining({
            date_creation_min: "01-06-2026",
          }),
        }),
      );
    });

    it("looks up a single company by SIRET via /entreprise", async () => {
      httpService.get.mockImplementation((url: string) => {
        if (String(url).includes("/entreprise")) {
          return of({
            data: {
              siren: "123456789",
              siret: "12345678900012",
              nom_entreprise: "Plomberie Dupont",
              code_naf: "43.22A",
              date_creation: "2026-01-15",
              siege: { ville: "Lyon", code_postal: "69001", siret: "12345678900012" },
              dirigeants: [{ prenoms: "Jean", nom: "Dupont" }],
            },
          });
        }
        if (String(url).includes("prospect-outreaches")) {
          return of({ data: { outreaches: [] } });
        }
        if (String(url).includes("suivi-jetons")) {
          return of({ data: { jetons: 42 } });
        }
        return of({ data: {} });
      });

      const result = await service.lookupProspectBySiret("12345678900012");

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/entreprise"),
        expect.objectContaining({
          params: expect.objectContaining({
            api_token: "test-pappers-key",
            siret: "12345678900012",
          }),
        }),
      );
      expect(result.total).toBe(1);
      expect(result.results[0]).toMatchObject({
        siren: "123456789",
        siret: "12345678900012",
        name: "Plomberie Dupont",
        alreadyContacted: false,
        city: "Lyon",
      });
      expect(result.creditsRemaining).toBe(42);
    });

    it("rejects invalid SIRET/SIREN for lookup", async () => {
      await expect(service.lookupProspectBySiret("123")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("returns 404 when Pappers has no company for SIRET", async () => {
      httpService.get.mockReturnValue(
        throwError(() =>
          Object.assign(new Error("Not found"), {
            response: { status: 404, data: { detail: "Entreprise introuvable" } },
          }),
        ),
      );

      await expect(service.lookupProspectBySiret("12345678900012")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("marks email not found without sending mail", async () => {
      httpService.get.mockReturnValue(of({ data: { outreaches: [] } }));
      httpService.post.mockReturnValue(of({ data: { id: "o1", status: "email_not_found" } }));

      const result = await service.markProspectEmailNotFound(
        { id: "staff-1", email: "staff@planwise.fr" },
        { siren: "123456789", companyName: "Plomberie Dupont" },
      );

      expect(result).toEqual({ ok: true });
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/prospect-outreaches"),
        expect.objectContaining({
          siren: "123456789",
          status: "email_not_found",
          subject: "Email non trouvé",
        }),
      );
      expect(httpService.post).not.toHaveBeenCalledWith(
        expect.stringContaining("/email/transactional"),
        expect.anything(),
      );
    });

    it("rejects email-not-found when already contacted", async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            outreaches: [
              {
                id: "o1",
                siren: "123456789",
                status: "sent",
                sentAt: "2026-07-01T00:00:00.000Z",
              },
            ],
          },
        }),
      );

      await expect(
        service.markProspectEmailNotFound(
          { id: "staff-1", email: "staff@planwise.fr" },
          { siren: "123456789", companyName: "X" },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("saves a prospect note via users-service", async () => {
      httpService.post.mockReturnValue(
        of({ data: { id: "o1", status: "noted", comment: "Pas d’e-mail sur le site" } }),
      );

      const result = await service.saveProspectNote(
        { id: "staff-1", email: "staff@planwise.fr" },
        {
          siren: "123456789",
          companyName: "Plomberie Dupont",
          comment: "Pas d’e-mail sur le site",
        },
      );

      expect(result).toEqual({ ok: true, comment: "Pas d’e-mail sur le site" });
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/prospect-outreaches/comment"),
        expect.objectContaining({
          siren: "123456789",
          comment: "Pas d’e-mail sur le site",
          sentByUserId: "staff-1",
        }),
      );
    });

    it("creates a manual prospect without Pappers", async () => {
      httpService.get.mockReturnValue(of({ data: { outreaches: [] } }));
      httpService.post.mockReturnValue(of({ data: { id: "o1", status: "noted" } }));

      const result = await service.createManualProspect(
        { id: "staff-1", email: "staff@planwise.fr" },
        {
          siren: "12345678901234",
          companyName: "Plomberie Dupont",
          email: "contact@dupont.fr",
          comment: "Vu sur LinkedIn",
        },
      );

      expect(result).toEqual({ ok: true });
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/prospect-outreaches"),
        expect.objectContaining({
          siren: "123456789",
          companyName: "Plomberie Dupont",
          email: "contact@dupont.fr",
          status: "noted",
          subject: "Ajout manuel",
          comment: "Vu sur LinkedIn",
          sentByUserId: "staff-1",
        }),
      );
    });

    it("rejects manual prospect when already tracked", async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            outreaches: [
              {
                id: "o1",
                siren: "123456789",
                status: "noted",
                sentAt: "2026-07-01T00:00:00.000Z",
              },
            ],
          },
        }),
      );

      await expect(
        service.createManualProspect(
          { id: "staff-1", email: "staff@planwise.fr" },
          { siren: "123456789", companyName: "X" },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it("rejects outreach without email", async () => {
      await expect(
        service.sendProspectOutreach(
          { id: "staff-1", email: "staff@planwise.fr" },
          { siren: "123456789", companyName: "X", toEmail: "", templateId: "tpl-1" },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects outreach without templateId", async () => {
      await expect(
        service.sendProspectOutreach(
          { id: "staff-1", email: "staff@planwise.fr" },
          { siren: "123456789", companyName: "X", toEmail: "a@b.fr", templateId: "" },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects outreach when template is missing", async () => {
      httpService.get.mockImplementation((url: string) => {
        if (String(url).includes("email-templates/")) {
          return throwError(() => ({ response: { status: 404 }, message: "Not Found" }));
        }
        return of({ data: { outreaches: [] } });
      });

      await expect(
        service.sendProspectOutreach(
          { id: "staff-1", email: "staff@planwise.fr" },
          {
            siren: "123456789",
            companyName: "X",
            toEmail: "a@b.fr",
            templateId: "missing-tpl",
          },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects outreach when already contacted", async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            outreaches: [
              {
                id: "o1",
                siren: "123456789",
                status: "sent",
                sentAt: "2026-07-01T00:00:00.000Z",
              },
            ],
          },
        }),
      );

      await expect(
        service.sendProspectOutreach(
          { id: "staff-1", email: "staff@planwise.fr" },
          {
            siren: "123456789",
            companyName: "X",
            toEmail: "a@b.fr",
            templateId: "tpl-1",
          },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("sends transactional email and logs outreach", async () => {
      httpService.get.mockImplementation((url: string) => {
        if (String(url).includes("email-templates/")) {
          return of({
            data: {
              id: "tpl-1",
              name: "Prospection beta",
              purpose: "prospect_outreach",
              subject: "Planwise — démarrer",
              body: "{{greeting}}\n\nPendant toute la beta, Planwise reste **gratuit**. Ensuite, l’abonnement Essentiel sera à **9,99 €** par mois, sans engagement, résiliable à tout moment.\n\n{{landingUrl}}\n\nÉditeur basé à Landerneau (29)",
              footer: "Cet e-mail est une présentation de Planwise.",
              ctaLabel: "Découvrir Planwise",
              ctaUrl: "/",
              isDefault: true,
              createdAt: "2026-08-01T00:00:00.000Z",
              updatedAt: "2026-08-01T00:00:00.000Z",
            },
          });
        }
        return of({ data: { outreaches: [] } });
      });
      httpService.post.mockReturnValue(of({ data: { sent: true } }));

      const result = await service.sendProspectOutreach(
        { id: "staff-1", email: "staff@planwise.fr" },
        {
          siren: "123456789",
          companyName: "Plomberie Dupont",
          toEmail: "jean@example.fr",
          contactName: "Jean Dupont",
          postalCode: "75011",
          templateId: "tpl-1",
        },
      );

      expect(result.sent).toBe(true);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/email/transactional"),
        expect.objectContaining({
          to: "jean@example.fr",
          subject: "Planwise — démarrer",
          body: expect.stringMatching(
            /Bonjour Jean Dupont,[\s\S]*\*\*gratuit\*\*[\s\S]*\*\*9,99 €\*\* par mois, sans engagement, résiliable à tout moment[\s\S]*Éditeur basé à Landerneau \(29\)/,
          ),
          footer: expect.stringContaining("présentation de Planwise"),
        }),
      );
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/prospect-outreaches"),
        expect.objectContaining({
          siren: "123456789",
          status: "sent",
          sentByUserId: "staff-1",
          subject: "Planwise — démarrer",
        }),
      );
    });

    it("returns configured false when PAPPERS_API_KEY is missing", async () => {
      delete process.env.PAPPERS_API_KEY;
      const credits = await service.getProspectCredits();
      expect(credits).toEqual({ configured: false });
    });

    it("parses suivi-jetons pay-as-you-go remaining credits", async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            jetons_abonnement: 0,
            jetons_abonnement_utilises: 0,
            jetons_pay_as_you_go_restants: 99,
          },
        }),
      );
      const credits = await service.getProspectCredits();
      expect(credits).toEqual({ configured: true, creditsRemaining: 99 });
    });
  });

  describe("sendUserEmail", () => {
    const staff = { id: "staff-1", email: "mail@benoistbabin.fr", name: "Benoist" };

    it("rejects short reason / subject / body", async () => {
      await expect(
        service.sendUserEmail(staff, "user-1", {
          subject: "Hi",
          body: "Too short",
          reason: "short",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.sendUserEmail(staff, "user-1", {
          subject: "ab",
          body: "Message assez long pour passer",
          reason: "Motif support ticket 42",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.sendUserEmail(staff, "user-1", {
          subject: "Objet ok",
          body: "court",
          reason: "Motif support ticket 42",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("sends transactional email to the user address", async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            id: "user-1",
            email: "client@acme.fr",
            status: "active",
            organizationId: "org-1",
          },
        }),
      );
      httpService.post.mockReturnValue(of({ data: { sent: true } }));

      const result = await service.sendUserEmail(staff, "user-1", {
        subject: "Suite à votre essai",
        body: "Bonjour, on peut en discuter demain ?",
        reason: "Ticket support #88 — relance",
      });

      expect(result).toEqual({ sent: true, to: "client@acme.fr" });
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/email/transactional"),
        expect.objectContaining({
          to: "client@acme.fr",
          subject: "Suite à votre essai",
          body: "Bonjour, on peut en discuter demain ?",
        }),
      );
    });

    it("forwards footer and CTA when provided", async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            id: "user-1",
            email: "client@acme.fr",
            status: "active",
            organizationId: "org-1",
          },
        }),
      );
      httpService.post.mockReturnValue(of({ data: { sent: true } }));

      await service.sendUserEmail(staff, "user-1", {
        subject: "Suite à votre essai",
        body: "Bonjour, on peut en discuter demain ?",
        reason: "Ticket support #88 — relance",
        templateId: "tpl-1",
        footer: "Pied custom",
        ctaLabel: "Ouvrir",
        ctaUrl: "/login",
      });

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/email/transactional"),
        expect.objectContaining({
          footer: "Pied custom",
          ctaLabel: "Ouvrir",
          url: "/login",
        }),
      );
    });
  });
});
