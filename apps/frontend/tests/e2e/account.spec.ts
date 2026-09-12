import { expect, test } from "./fixtures";

const admin = {
  id: "user-e2e",
  email: "admin@example.com",
  name: "Alex Admin",
  organizationId: "org-e2e",
  role: "admin",
  status: "active",
  permissions: ["subscription.active", "organizations.read", "customers.read"],
  isFoundingAdmin: true,
};

const completedPrefs = {
  userId: admin.id,
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

test.describe("Compte — accès invité", () => {
  test("la fiche compte redirige vers la connexion", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });

  test("la modification de compte redirige vers la connexion", async ({ page }) => {
    await page.goto("/account/edit");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Compte — modifier le nom", () => {
  test("fiche → modifier → enregistrer → retour fiche", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-account-token");
    });

    let current = { ...admin };

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/auth/me")) {
        await route.fulfill({ json: current });
        return;
      }
      if (method === "GET" && path.includes("/account/preferences")) {
        await route.fulfill({ json: completedPrefs });
        return;
      }
      if (method === "PUT" && path.includes("/account/name")) {
        const body = req.postDataJSON() as { name?: string };
        current = { ...current, name: body.name ?? current.name };
        await route.fulfill({ json: current });
        return;
      }
      if (method === "PUT" && path.includes("/account/preferences")) {
        await route.fulfill({ json: completedPrefs });
        return;
      }
      if (method === "GET" && path.includes("/account/sessions")) {
        await route.fulfill({ json: { sessions: [] } });
        return;
      }
      if (method === "GET" && path.includes("/organizations/mine")) {
        await route.fulfill({ json: { organizations: [{ id: "org-e2e", name: "Orga E2E" }] } });
        return;
      }
      if (method === "GET" && path.includes("/subscriptions/current")) {
        await route.fulfill({ json: { hasAccess: true, maxUsers: 2, status: "trialing" } });
        return;
      }
      if (method === "GET" && path.includes("/notifications/unread-count")) {
        await route.fulfill({ json: { count: 0 } });
        return;
      }
      if (method === "GET" && path.includes("/trial-test-data/status")) {
        await route.fulfill({ json: { status: "idle", hasTestData: false } });
        return;
      }
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Mon compte" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Alex Admin", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Modifier" }).click();
    await expect(page).toHaveURL(/\/account\/edit/);
    await expect(page.getByRole("heading", { name: /Modifier mon compte/ })).toBeVisible();

    await page.getByLabel("Nom complet").fill("Alex Atelier");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText("Alex Atelier", { exact: true })).toBeVisible();
  });
});
