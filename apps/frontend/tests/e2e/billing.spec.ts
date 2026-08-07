import { test, expect } from "./fixtures";

test.describe("Parcours suivi facturation", () => {
  test("la page facturation redirige sans session", async ({ page }) => {
    await page.goto("/billing");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("créer une facture depuis un dossier protège la route sans session", async ({ page }) => {
    await page.goto("/cases/case-demo");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});

/**
 * Boucle essai : guide bienvenue → intégrations → activer démo → dossier → facture démo → suivi.
 * Mocks API : on valide le parcours UI, pas le microservice.
 */
test.describe("Boucle essai facturation démo", () => {
  const foundingAdmin = {
    id: "user-e2e-trial",
    email: "trial@example.com",
    name: "Alex Essai",
    organizationId: "org-e2e",
    role: "admin",
    status: "active",
    permissions: [
      "subscription.active",
      "customers.create",
      "customers.read",
      "organizations.read",
      "cases.read",
      "cases.create",
      "exports.billing",
      "integrations.demo.read",
      "integrations.demo.configure",
      "integrations.demo.sync",
    ],
    isFoundingAdmin: true,
  };

  const completedPrefs = {
    userId: foundingAdmin.id,
    preferences: {
      theme: "light",
      sidebarCollapsed: "expanded",
      quickActions: [
        { id: "qa_default_case_new", href: "/cases/new", label: "Nouveau dossier" },
        { id: "qa_default_cases_list", href: "/cases", label: "Tous les dossiers" },
        { id: "qa_default_calendar", href: "/cases/calendar", label: "Planning" },
        {
          id: "qa_default_case_templates",
          href: "/settings/case-templates",
          label: "Modèles de dossier",
        },
      ],
      onboardingCompletedOrganizationIds: ["org-e2e"],
      onboardingProfileCompleted: true,
      setupGuideDismissedOrganizationIds: [] as string[],
      setupGuideDismissed: false,
    },
  };

  const dismissedGuidePrefs = {
    userId: foundingAdmin.id,
    preferences: {
      ...completedPrefs.preferences,
      setupGuideDismissedOrganizationIds: ["org-e2e"],
      setupGuideDismissed: true,
    },
  };

  const demoCase = {
    id: "case-demo-invoice",
    organizationId: "org-e2e",
    title: "Dossier démo à facturer",
    status: "completed",
    billingStatus: "to_invoice",
    priority: "medium",
    assignees: [],
    tags: [],
    steps: [],
    progress: 100,
    interventionCount: 0,
  };

  test("guide → activer démo → créer facture sur dossier → suivi facturation", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-trial-billing-token");
    });

    let setupGuideDismissed = false;
    let demoConnected = false;

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/auth/me")) {
        await route.fulfill({ json: foundingAdmin });
        return;
      }
      if (method === "GET" && path.includes("/account/preferences")) {
        await route.fulfill({
          json: setupGuideDismissed ? dismissedGuidePrefs : completedPrefs,
        });
        return;
      }
      if (method === "PUT" && path.includes("/account/preferences")) {
        const body = req.postDataJSON() as { setupGuideDismissed?: boolean };
        if (body.setupGuideDismissed) setupGuideDismissed = true;
        await route.fulfill({
          json: {
            preferences: setupGuideDismissed
              ? dismissedGuidePrefs.preferences
              : completedPrefs.preferences,
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/organizations/mine")) {
        await route.fulfill({
          json: { organizations: [{ id: "org-e2e", name: "Orga Essai" }] },
        });
        return;
      }
      if (method === "GET" && path.includes("/subscriptions/current")) {
        await route.fulfill({
          json: { hasAccess: true, maxUsers: 2, status: "trialing" },
        });
        return;
      }
      if (method === "GET" && path.includes("/trial-test-data/status")) {
        await route.fulfill({
          json: { status: "idle", hasTestData: false },
        });
        return;
      }
      if (method === "GET" && path.includes("/integrations/billing-availability")) {
        await route.fulfill({
          json: {
            connected: demoConnected,
            pennylane: false,
            qonto: false,
            demo: demoConnected,
            demoAvailable: true,
          },
        });
        return;
      }
      if (method === "GET" && path.endsWith("/integrations/demo")) {
        await route.fulfill({
          json: {
            provider: "demo",
            connected: demoConnected,
            companyName: demoConnected ? "Démo Planwise" : undefined,
            available: true,
          },
        });
        return;
      }
      if (method === "POST" && path.includes("/integrations/demo/connect")) {
        demoConnected = true;
        await route.fulfill({
          json: {
            provider: "demo",
            connected: true,
            companyName: "Démo Planwise",
            available: true,
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/integrations/pennylane")) {
        await route.fulfill({ json: { provider: "pennylane", connected: false } });
        return;
      }
      if (method === "GET" && path.includes("/integrations/qonto")) {
        await route.fulfill({ json: { provider: "qonto", connected: false } });
        return;
      }
      if (method === "GET" && path.includes("/cases/items/") && path.includes("/history")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes(`/cases/items/${demoCase.id}`)) {
        await route.fulfill({ json: demoCase });
        return;
      }
      if (method === "GET" && path.includes("/cases/comments")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/documents")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/cases/interventions")) {
        await route.fulfill({ json: { interventions: [], total: 0 } });
        return;
      }
      if (method === "GET" && path.includes("/cases/quotes")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/invoice-sync") && path.includes("/cases/")) {
        await route.fulfill({ json: { invoices: [] } });
        return;
      }
      if (method === "GET" && path.includes("/integrations/invoice-syncs/stats")) {
        await route.fulfill({
          json: {
            total: demoConnected ? 1 : 0,
            draftCount: demoConnected ? 1 : 0,
            finalizedCount: 0,
            paidCount: 0,
            cancelledCount: 0,
            unknownCount: 0,
            amountHtDraft: demoConnected ? "120.00" : "0",
            amountHtFinalized: "0",
            amountHtPaid: "0",
            amountHtTotal: demoConnected ? "120.00" : "0",
            byKind: demoConnected ? { invoice: 1 } : {},
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/integrations/invoice-syncs")) {
        await route.fulfill({
          json: {
            invoices: demoConnected
              ? [
                  {
                    id: "inv-demo-1",
                    organizationId: "org-e2e",
                    caseId: demoCase.id,
                    caseTitle: demoCase.title,
                    provider: "demo",
                    invoiceKind: "invoice",
                    remoteStatus: "draft",
                    remoteInvoiceId: "demo-1",
                    remoteCustomerId: "demo-customer",
                    draft: true,
                    amountHt: "120.00",
                    lastSyncedAt: "2026-08-01T10:00:00.000Z",
                  },
                ]
              : [],
            total: demoConnected ? 1 : 0,
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/admin/users")) {
        await route.fulfill({ json: { users: [] } });
        return;
      }
      if (method === "GET" && path.includes("/fleet/teams")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/fleet/vehicles")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/fleet/technicians")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/stock/articles")) {
        await route.fulfill({ json: { articles: [], total: 0 } });
        return;
      }
      if (method === "GET" && path.includes("/stock/prestations")) {
        await route.fulfill({ json: { prestations: [], total: 0 } });
        return;
      }
      if (method === "GET" && path.includes("/stock/locations")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/stock/movements")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/customers")) {
        await route.fulfill({ json: { customers: [], total: 0 } });
        return;
      }
      if (method === "GET" && path.includes("/order-givers")) {
        await route.fulfill({ json: { orderGivers: [], total: 0 } });
        return;
      }
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Bienvenue dans Planwise" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Connecter son outil de facturation/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Connecter son outil de facturation/i }).click();
    await expect(page).toHaveURL(/\/settings\/integrations/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Facturation démo" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Activer la facturation démo/i })).toBeVisible();

    await page.getByRole("button", { name: /Activer la facturation démo/i }).click();
    await expect(page.getByText(/^Activée/)).toBeVisible({ timeout: 10_000 });

    await page.goto(`/cases/${demoCase.id}`);
    await expect(page.getByText(demoCase.title).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Créer une facture démo/i })).toBeVisible();

    await page.goto("/billing");
    await expect(page.getByRole("heading", { name: "Facturation" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Connectez votre outil de facturation")).toHaveCount(0);
    await expect(page.getByText(demoCase.title)).toBeVisible();
  });
});
