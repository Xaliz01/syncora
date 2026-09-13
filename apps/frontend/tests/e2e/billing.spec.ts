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

test.describe("Boucle facturation locale", () => {
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
      "quotes.read",
      "exports.billing",
      "billing.invoices.read",
      "billing.invoices.create",
      "billing.invoices.finalize",
      "billing.invoices.send",
    ],
    isFoundingAdmin: true,
  };

  const completedPrefs = {
    userId: foundingAdmin.id,
    preferences: {
      theme: "light",
      sidebarCollapsed: "expanded",
      voiceFieldEnabled: false,
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
    title: "Dossier à facturer",
    status: "completed",
    billingStatus: "to_invoice",
    priority: "medium",
    assignees: [],
    tags: [],
    steps: [],
    progress: 100,
    interventionCount: 0,
    customerId: "cust-1",
    customer: { id: "cust-1", displayName: "Client SA" },
  };

  const quote = {
    id: "quote-1",
    organizationId: "org-e2e",
    caseId: demoCase.id,
    quoteNumber: "D-001",
    status: "accepted",
    totalHt: 120,
    totalTva: 24,
    totalTtc: 144,
    lines: [
      {
        id: "line-1",
        description: "Prestation",
        quantity: 1,
        unitPrice: 120,
        tvaRate: 20,
        totalHt: 120,
        totalTtc: 144,
      },
    ],
  };

  test("dossier → créer une facture → suivi facturation", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-trial-billing-token");
    });

    let setupGuideDismissed = false;
    let createdInvoice = false;

    const localInvoice = {
      id: "inv-1",
      organizationId: "org-e2e",
      caseId: demoCase.id,
      caseTitle: demoCase.title,
      quoteId: quote.id,
      kind: "full",
      status: "draft",
      draftNumber: "BROUILLON-X",
      invoiceDate: "2026-09-01T00:00:00.000Z",
      amountHt: "120.00",
      amountTtc: "144.00",
      lines: [{ label: "Prestation", quantity: 1, unitPriceHt: "120.00", tvaRate: 20 }],
      customer: { partyId: "cust-1", partyType: "customer", displayName: "Client SA" },
    };

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
        await route.fulfill({ json: { status: "idle", hasTestData: false } });
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
        await route.fulfill({ json: [quote] });
        return;
      }
      if (method === "POST" && path.includes(`/billing/cases/${demoCase.id}/invoices`)) {
        createdInvoice = true;
        await route.fulfill({ json: localInvoice });
        return;
      }
      if (method === "GET" && path.includes("/billing/invoices/stats")) {
        await route.fulfill({
          json: {
            total: createdInvoice ? 1 : 0,
            draftCount: createdInvoice ? 1 : 0,
            finalizedCount: 0,
            paidCount: 0,
            cancelledCount: 0,
            amountHtDraft: createdInvoice ? "120.00" : "0",
            amountHtFinalized: "0",
            amountHtPaid: "0",
            amountHtTotal: createdInvoice ? "120.00" : "0",
            byKind: createdInvoice ? { full: 1 } : {},
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/billing/invoices")) {
        await route.fulfill({
          json: {
            invoices: createdInvoice ? [localInvoice] : [],
            total: createdInvoice ? 1 : 0,
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/admin/users")) {
        await route.fulfill({ json: { users: [] } });
        return;
      }
      if (method === "GET" && path.includes("/fleet/")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/stock/movements")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/stock/locations")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/stock/")) {
        await route.fulfill({ json: { articles: [], prestations: [], total: 0 } });
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
    await expect(page.getByRole("button", { name: /Créer une première facture/i })).toBeVisible();
    await page.getByRole("button", { name: /Passer pour l’instant/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.goto(`/cases/${demoCase.id}`);
    await expect(page.getByText(demoCase.title).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Créer une facture/i }).first()).toBeVisible();
    await page
      .getByRole("button", { name: /Créer une facture/i })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: /Brouillon de facture/i })).toBeVisible();
    await expect(
      page.getByText(
        "L’émission de factures via la facturation électronique arrivera prochainement.",
      ),
    ).toBeVisible();
    await page.getByText("Situation", { exact: true }).click();
    await expect(page.getByText("Avancement cumulé (%)")).toBeVisible();
    await expect(page.getByText(/avancement total du chantier/i)).toBeVisible();
    await page.getByText("Facture complète", { exact: true }).click();
    await page.getByRole("button", { name: /Créer le brouillon/i }).click();
    await expect(page.getByText(/Facture brouillon créée/i)).toBeVisible({ timeout: 10_000 });

    await page.goto("/billing");
    await expect(page.getByRole("heading", { name: "Facturation" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(
        "L’émission de factures via la facturation électronique arrivera prochainement.",
      ),
    ).toBeVisible();
    await expect(page.getByText(demoCase.title)).toBeVisible();
  });

  test("envoyer une facture : annuler puis confirmer avec destinataire modifié", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-trial-billing-token");
    });

    const issuedInvoice = {
      id: "inv-sent",
      organizationId: "org-e2e",
      caseId: demoCase.id,
      caseTitle: demoCase.title,
      kind: "full",
      status: "finalized",
      number: "F-2026-00001",
      invoiceDate: "2026-09-01T00:00:00.000Z",
      amountHt: "120.00",
      amountTtc: "144.00",
      lines: [{ label: "Prestation", quantity: 1, unitPriceHt: "120.00", tvaRate: 20 }],
      customer: {
        partyId: "cust-1",
        partyType: "customer",
        displayName: "Client SA",
        email: "client@example.com",
      },
      emailSends: [] as unknown[],
    };
    let sendCalls = 0;
    let lastSendTo: string | undefined;

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
        await route.fulfill({ json: dismissedGuidePrefs });
        return;
      }
      if (method === "POST" && path.includes("/billing/invoices/inv-sent/send")) {
        sendCalls += 1;
        const body = req.postDataJSON() as { to?: string };
        lastSendTo = body.to;
        await route.fulfill({
          json: {
            ...issuedInvoice,
            emailSends: [
              {
                sentAt: "2026-09-10T12:00:00.000Z",
                to: body.to ?? "client@example.com",
                sentByUserId: foundingAdmin.id,
                sentByName: foundingAdmin.name,
                status: "sent",
              },
            ],
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/billing/invoices/stats")) {
        await route.fulfill({
          json: {
            total: 1,
            draftCount: 0,
            finalizedCount: 1,
            paidCount: 0,
            cancelledCount: 0,
            amountHtDraft: "0",
            amountHtFinalized: "120.00",
            amountHtPaid: "0",
            amountHtTotal: "120.00",
            byKind: { full: 1 },
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/billing/invoices")) {
        await route.fulfill({ json: { invoices: [issuedInvoice], total: 1 } });
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

    await page.goto("/billing");
    await expect(page.getByRole("heading", { name: "Facturation" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByRole("heading", { name: "Envoyer la facture" })).toBeVisible();
    await expect(page.getByText("Le PDF de la facture sera joint.")).toBeVisible();
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByRole("heading", { name: "Envoyer la facture" })).toHaveCount(0);
    expect(sendCalls).toBe(0);

    await page.getByRole("button", { name: "Envoyer" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Destinataire")).toHaveValue("client@example.com");
    await dialog.getByLabel("Destinataire").fill("autre-client@example.com");
    await dialog.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText(/Facture envoyée/i)).toBeVisible({ timeout: 10_000 });
    expect(sendCalls).toBe(1);
    expect(lastSendTo).toBe("autre-client@example.com");
  });

  test("sans billing.invoices.send : historique visible, Envoyer masqué", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-trial-billing-token");
    });

    const readOnlyUser = {
      ...foundingAdmin,
      role: "member" as const,
      isFoundingAdmin: false,
      permissions: foundingAdmin.permissions.filter((code) => code !== "billing.invoices.send"),
    };

    const issuedInvoice = {
      id: "inv-sent-readonly",
      organizationId: "org-e2e",
      caseId: demoCase.id,
      caseTitle: demoCase.title,
      kind: "full",
      status: "finalized",
      number: "F-2026-00002",
      invoiceDate: "2026-09-01T00:00:00.000Z",
      amountHt: "120.00",
      amountTtc: "144.00",
      lines: [{ label: "Prestation", quantity: 1, unitPriceHt: "120.00", tvaRate: 20 }],
      customer: {
        partyId: "cust-1",
        partyType: "customer",
        displayName: "Client SA",
        email: "client@example.com",
      },
      emailSends: [
        {
          sentAt: "2026-09-10T12:00:00.000Z",
          to: "client@example.com",
          sentByUserId: foundingAdmin.id,
          sentByName: foundingAdmin.name,
          status: "sent",
        },
      ],
    };

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/auth/me")) {
        await route.fulfill({ json: readOnlyUser });
        return;
      }
      if (method === "GET" && path.includes("/account/preferences")) {
        await route.fulfill({ json: dismissedGuidePrefs });
        return;
      }
      if (method === "GET" && path.includes("/billing/invoices/stats")) {
        await route.fulfill({
          json: {
            total: 1,
            draftCount: 0,
            finalizedCount: 1,
            paidCount: 0,
            cancelledCount: 0,
            amountHtDraft: "0",
            amountHtFinalized: "120.00",
            amountHtPaid: "0",
            amountHtTotal: "120.00",
            byKind: { full: 1 },
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/billing/invoices")) {
        await route.fulfill({ json: { invoices: [issuedInvoice], total: 1 } });
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

    await page.goto("/billing");
    await expect(page.getByRole("heading", { name: "Facturation" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Envoyée le .* à client@example.com/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Envoyer" })).toHaveCount(0);
  });
});
