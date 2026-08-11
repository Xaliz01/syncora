import { expect, test } from "./fixtures";

test.describe("Historique de navigation", () => {
  const user = {
    id: "user-e2e-history",
    email: "history@example.com",
    name: "Alex History",
    organizationId: "org-e2e",
    role: "admin",
    status: "active",
    permissions: ["subscription.active", "customers.read", "cases.read", "organizations.read"],
    isFoundingAdmin: false,
  };

  test("enregistre une page visitée et l’affiche dans le panneau", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-history-token");
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
        await route.fulfill({
          json: {
            userId: user.id,
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
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/organizations/mine")) {
        await route.fulfill({
          json: { organizations: [{ id: "org-e2e", name: "Orga E2E" }] },
        });
        return;
      }
      if (method === "GET" && path.includes("/subscriptions/current")) {
        await route.fulfill({
          json: { hasAccess: true, maxUsers: 5, status: "trialing" },
        });
        return;
      }
      if (method === "GET" && path.includes("/customers")) {
        await route.fulfill({ json: { customers: [], items: [], total: 0 } });
        return;
      }
      if (method === "GET" && (path.includes("/dashboard") || path.includes("/cases"))) {
        await route.fulfill({
          json: { items: [], cases: [], total: 0, interventions: [], todos: [] },
        });
        return;
      }
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Historique de navigation" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("link", { name: "Clients", exact: true }).first().click();
    await expect(page).toHaveURL(/\/customers/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Clients/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Historique de navigation" }).click();
    const dialog = page.getByRole("dialog", { name: "Historique de navigation" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link").filter({ hasText: "Clients" }).first()).toBeVisible();
  });
});
