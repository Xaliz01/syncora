import { expect, test } from "./fixtures";

const shellUser = {
  id: "user-e2e-search",
  email: "membre@example.com",
  name: "Camille Membre",
  organizationId: "org-e2e",
  role: "member" as const,
  status: "active",
  isFoundingAdmin: false,
};

const completedPrefs = {
  userId: shellUser.id,
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

const SEARCH_CATALOG = [
  {
    permission: "customers.read",
    item: {
      id: "cust-1",
      type: "customer",
      title: "Dupont Services",
      subtitle: "Entreprise",
      url: "/customers/cust-1",
    },
  },
  {
    permission: "billing.invoices.read",
    item: {
      id: "inv-1",
      type: "invoice",
      title: "F-2026-00001",
      subtitle: "Facture · Dupont Services",
      url: "/cases/case-99",
    },
  },
] as const;

function searchPayload(permissions: readonly string[]) {
  const granted = new Set(permissions);
  const results = SEARCH_CATALOG.filter((entry) => granted.has(entry.permission)).map(
    (entry) => entry.item,
  );
  const counts: Record<string, number> = {};
  for (const result of results) {
    counts[result.type] = (counts[result.type] ?? 0) + 1;
  }
  return { query: "Dupont", results, counts };
}

async function mockShell(page: import("@playwright/test").Page, permissions: string[]) {
  const user = { ...shellUser, permissions };
  await page.addInitScript(() => {
    localStorage.setItem("planwise_access_token", "e2e-search-token");
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, "") || url.pathname;
    const method = req.method();

    if (method === "GET" && path.endsWith("/auth/me")) {
      await route.fulfill({ json: user });
      return;
    }
    if (method === "GET" && path.includes("/account/preferences")) {
      await route.fulfill({ json: completedPrefs });
      return;
    }
    if (method === "GET" && path.includes("/organizations/mine")) {
      await route.fulfill({
        json: { organizations: [{ id: "org-e2e", name: "Orga E2E" }] },
      });
      return;
    }
    if (method === "GET" && path.includes("/subscriptions/current")) {
      await route.fulfill({ json: { hasAccess: true, maxUsers: 5, status: "trialing" } });
      return;
    }
    if (method === "GET" && path.includes("/notifications/unread-count")) {
      await route.fulfill({ json: { count: 0 } });
      return;
    }
    if (method === "GET" && path.startsWith("/search")) {
      await route.fulfill({ json: searchPayload(permissions) });
      return;
    }
    await route.fulfill({ status: 200, json: {} });
  });
}

test.describe("Recherche selon les droits", () => {
  test("un membre sans lecture des factures ne voit pas les factures", async ({ page }) => {
    await mockShell(page, ["subscription.active", "customers.read", "organizations.read"]);

    await page.goto("/search?q=Dupont");
    await expect(page.getByRole("heading", { name: "Recherche globale" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: "Dupont Services Entreprise" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Factures/ })).toHaveCount(0);
    await expect(page.getByText("F-2026-00001")).toHaveCount(0);
  });

  test("un membre autorisé à lire les factures les voit dans les résultats", async ({ page }) => {
    await mockShell(page, [
      "subscription.active",
      "customers.read",
      "billing.invoices.read",
      "organizations.read",
    ]);

    await page.goto("/search?q=Dupont");
    await expect(page.getByRole("heading", { name: "Recherche globale" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: /F-2026-00001/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Factures/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dupont Services Entreprise" })).toBeVisible();
  });
});
