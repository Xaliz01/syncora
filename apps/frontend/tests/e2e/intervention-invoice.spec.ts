import { expect, test } from "./fixtures";
import type { Route } from "@playwright/test";

const foundingAdmin = {
  id: "user-e2e-int-invoice",
  email: "trial@example.com",
  name: "Alex Essai",
  organizationId: "org-e2e",
  role: "admin",
  status: "active",
  permissions: [
    "subscription.active",
    "organizations.read",
    "customers.read",
    "cases.read",
    "interventions.read",
    "interventions.update",
    "quotes.read",
    "stock.articles.read",
    "prestations.read",
    "stock.interventions.read",
    "stock.interventions.create",
    "billing.invoices.read",
    "billing.invoices.create",
  ],
  isFoundingAdmin: true,
};

const dismissedGuidePrefs = {
  userId: foundingAdmin.id,
  preferences: {
    theme: "light",
    sidebarCollapsed: "expanded",
    voiceFieldEnabled: false,
    quickActions: [],
    onboardingCompletedOrganizationIds: ["org-e2e"],
    onboardingProfileCompleted: true,
    setupGuideDismissedOrganizationIds: ["org-e2e"],
    setupGuideDismissed: true,
  },
};

const demoCase = {
  id: "case-demo-int-invoice",
  organizationId: "org-e2e",
  title: "Dossier interventions à facturer",
  status: "completed",
  billingStatus: "none",
  priority: "medium",
  assignees: [],
  tags: [],
  steps: [],
  progress: 100,
  interventionCount: 2,
  customerId: "cust-1",
  customer: { id: "cust-1", displayName: "Client SA" },
};

const articles = [
  {
    id: "art-vis",
    organizationId: "org-e2e",
    name: "Vis inox",
    reference: "VIS-1",
    unit: "u",
    defaultPrice: 12,
    stockQuantity: 40,
  },
  {
    id: "art-joint",
    organizationId: "org-e2e",
    name: "Joint",
    reference: "JNT-9",
    unit: "u",
    defaultPrice: 4,
    stockQuantity: 20,
  },
];

const prestations = [
  {
    id: "presta-mo",
    organizationId: "org-e2e",
    name: "Main d'œuvre",
    reference: "MO-H",
    unit: "h",
    defaultPrice: 55,
    defaultTvaRate: 20,
    isActive: true,
  },
];

function intervention(id: string, title: string) {
  return {
    id,
    organizationId: "org-e2e",
    caseId: demoCase.id,
    title,
    status: "completed",
    billingStatus: "none",
  };
}

async function mockAppShell(route: Route): Promise<boolean> {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname.replace(/^\/api/, "") || url.pathname;
  const method = req.method();

  if (method === "GET" && path.includes("/account/preferences")) {
    await route.fulfill({ json: dismissedGuidePrefs });
    return true;
  }
  if (method === "GET" && path.includes("/organizations/mine")) {
    await route.fulfill({ json: { organizations: [{ id: "org-e2e", name: "Orga Essai" }] } });
    return true;
  }
  if (method === "GET" && path.includes("/subscriptions/current")) {
    await route.fulfill({ json: { hasAccess: true, maxUsers: 2, status: "trialing" } });
    return true;
  }
  if (method === "GET" && path.includes("/notifications/unread-count")) {
    await route.fulfill({ json: { count: 0 } });
    return true;
  }
  if (method === "GET" && path.includes("/trial-test-data/status")) {
    await route.fulfill({ json: { status: "idle", hasTestData: false } });
    return true;
  }
  if (method === "GET" && path.includes("/account/sessions")) {
    await route.fulfill({ json: { sessions: [] } });
    return true;
  }
  return false;
}

test.describe("Articles intervention et facture", () => {
  test("article + prestation puis facture depuis une et deux interventions", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-int-invoice-token");
    });

    const movements: Array<Record<string, unknown>> = [];
    let prestationUsages: Array<Record<string, unknown>> = [];
    const createdBodies: Array<{
      interventionIds?: string[];
      lines?: Array<{ prestationId?: string; articleId?: string; label?: string }>;
    }> = [];

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/auth/me")) {
        await route.fulfill({ json: foundingAdmin });
        return;
      }
      if (await mockAppShell(route)) return;
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
        await route.fulfill({
          json: {
            interventions: [
              intervention("int-1", "Remplacement vanne"),
              intervention("int-2", "Contrôle annuel"),
            ],
            total: 2,
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/cases/quotes")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "POST" && path.includes("/billing/cases/") && path.includes("/preview-pdf")) {
        await route.fulfill({
          status: 200,
          contentType: "application/pdf",
          body: "%PDF-1.4",
        });
        return;
      }
      if (method === "POST" && path.includes(`/billing/cases/${demoCase.id}/invoices`)) {
        const body = req.postDataJSON() as {
          interventionIds?: string[];
          lines?: Array<{ prestationId?: string; articleId?: string; label?: string }>;
        };
        createdBodies.push(body);
        await route.fulfill({
          json: {
            id: `inv-${createdBodies.length}`,
            organizationId: "org-e2e",
            caseId: demoCase.id,
            kind: "full",
            status: "draft",
            draftNumber: "BROUILLON-X",
            invoiceDate: "2026-09-13T00:00:00.000Z",
            amountHt: "67.00",
            amountTtc: "80.40",
            lines: body.lines ?? [],
            customer: { partyId: "cust-1", partyType: "customer", displayName: "Client SA" },
            interventionIds: body.interventionIds ?? [],
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/billing/invoices")) {
        await route.fulfill({ json: { invoices: [], total: 0 } });
        return;
      }
      if (method === "POST" && path.includes("/stock/interventions/int-1/articles")) {
        movements.push({
          id: "mov-1",
          organizationId: "org-e2e",
          caseId: demoCase.id,
          interventionId: "int-1",
          articleId: "art-vis",
          articleName: "Vis inox",
          articleReference: "VIS-1",
          movementType: "out",
          quantity: 1,
        });
        await route.fulfill({ json: movements[0] });
        return;
      }
      if (method === "PUT" && path.includes("/stock/interventions/int-1/prestations")) {
        const body = req.postDataJSON() as {
          usages?: Array<{ prestationId: string; quantity: number }>;
        };
        prestationUsages = (body.usages ?? [])
          .filter((u) => u.quantity > 0)
          .map((u) => ({
            id: `usage-${u.prestationId}`,
            organizationId: "org-e2e",
            interventionId: "int-1",
            caseId: demoCase.id,
            prestationId: u.prestationId,
            prestationName: "Main d'œuvre",
            prestationReference: "MO-H",
            unit: "h",
            quantity: u.quantity,
            defaultPrice: 55,
            defaultTvaRate: 20,
          }));
        await route.fulfill({ json: prestationUsages });
        return;
      }
      if (method === "GET" && path.includes("/stock/intervention-prestation-usages")) {
        await route.fulfill({ json: { usages: prestationUsages } });
        return;
      }
      if (
        method === "GET" &&
        path.includes("/stock/interventions/") &&
        path.includes("/prestations")
      ) {
        await route.fulfill({ json: { usages: prestationUsages } });
        return;
      }
      if (method === "GET" && path.includes("/stock/movements")) {
        await route.fulfill({ json: movements });
        return;
      }
      if (method === "GET" && path.includes("/stock/locations")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/stock/articles")) {
        await route.fulfill({ json: { articles, total: articles.length } });
        return;
      }
      if (method === "GET" && path.includes("/stock/prestations")) {
        await route.fulfill({ json: { prestations, total: prestations.length } });
        return;
      }
      if (method === "GET" && path.includes("/stock/")) {
        await route.fulfill({ json: { articles: [], prestations: [], total: 0 } });
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

    await page.goto(`/cases/${demoCase.id}`);
    await expect(page.getByText(demoCase.title).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Ajouter articles / prestations" }).first().click();
    await expect(page.getByRole("heading", { name: "Articles et prestations" })).toBeVisible();
    await page.getByRole("button", { name: "Article ou prestation", exact: true }).click();
    await page.getByRole("searchbox", { name: /Rechercher — Article ou prestation/ }).fill("joint");
    await expect(page.getByRole("option", { name: /Vis inox/ })).toHaveCount(0);
    await page.getByRole("searchbox", { name: /Rechercher — Article ou prestation/ }).fill("vis");
    await page.getByRole("option", { name: /VIS-1 — Vis inox/ }).click();

    await page.getByRole("button", { name: "+ Ajouter une ligne" }).click();
    await page.getByRole("button", { name: "Article ou prestation", exact: true }).click();
    await page.getByRole("searchbox", { name: /Rechercher — Article ou prestation/ }).fill("main");
    await page.getByRole("option", { name: /MO-H — Main d'œuvre/ }).click();
    await expect(page.getByText("Emplacement")).toHaveCount(0);

    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Consommations de l'intervention mises à jour")).toBeVisible();

    await page.getByRole("button", { name: "Facturer", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: /Brouillon de facture/i })).toBeVisible();
    await expect(page.getByText(/Vis inox/)).toBeVisible();
    await expect(page.getByText(/Main d'œuvre/)).toBeVisible();
    await page.getByRole("button", { name: /Créer le brouillon/i }).click();
    await expect(page.getByText("Facture brouillon créée.")).toBeVisible({ timeout: 10_000 });
    expect(createdBodies[0]?.interventionIds).toEqual(["int-1"]);
    expect(createdBodies[0]?.lines?.some((l) => l.prestationId === "presta-mo")).toBe(true);
    await page.getByRole("button", { name: "Valider plus tard" }).click();

    await page
      .getByRole("heading", { name: /Interventions/ })
      .locator("..")
      .getByRole("button", { name: "Créer une facture" })
      .click();
    await expect(page.getByRole("heading", { name: /Brouillon de facture/i })).toBeVisible();
    await page.getByRole("button", { name: /Créer le brouillon/i }).click();
    await expect(page.getByText("Facture brouillon créée.")).toBeVisible({ timeout: 10_000 });
    expect(createdBodies[1]?.interventionIds).toEqual(["int-1", "int-2"]);
  });
});
