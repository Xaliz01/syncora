import { expect, test } from "./fixtures";

const admin = {
  id: "user-e2e",
  email: "admin@example.com",
  name: "Alex Admin",
  organizationId: "org-e2e",
  role: "admin",
  status: "active",
  permissions: [
    "subscription.active",
    "organizations.read",
    "organizations.update",
    "customers.read",
  ],
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

const org = {
  id: "org-e2e",
  name: "Orga E2E",
  siret: "12345678901234",
  email: "facturation@example.fr",
  phone: "0102030405",
  addressLine1: "1 rue de Paris",
  postalCode: "75001",
  city: "Paris",
  country: "FR",
};

test.describe("Organisation — accès invité", () => {
  test("la fiche organisation redirige vers la connexion", async ({ page }) => {
    await page.goto("/organization");
    await expect(page).toHaveURL(/\/login/);
  });

  test("la modification d’organisation redirige vers la connexion", async ({ page }) => {
    await page.goto("/organization/edit");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Organisation — mentions sans droit de modification", () => {
  test("un membre voit les mentions mais pas Modifier", async ({ page }) => {
    const member = {
      ...admin,
      role: "member",
      permissions: ["subscription.active", "organizations.read", "customers.read"],
    };
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-org-member-token");
    });
    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();
      if (method === "GET" && path.endsWith("/auth/me")) {
        await route.fulfill({ json: member });
        return;
      }
      if (method === "GET" && path.includes("/account/preferences")) {
        await route.fulfill({ json: completedPrefs });
        return;
      }
      if (method === "GET" && path.includes("/organizations/mine")) {
        await route.fulfill({ json: { organizations: [org] } });
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

    await page.goto("/organization");
    await expect(
      page.getByRole("heading", { name: "Facturation et mentions légales" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);
  });
});

test.describe("Organisation — modifier les coordonnées", () => {
  test("fiche → modifier → enregistrer → retour fiche", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-org-token");
    });

    let current = { ...org };

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/auth/me")) {
        await route.fulfill({ json: admin });
        return;
      }
      if (method === "GET" && path.includes("/account/preferences")) {
        await route.fulfill({ json: completedPrefs });
        return;
      }
      if (method === "GET" && path.includes("/organizations/mine")) {
        await route.fulfill({ json: { organizations: [current] } });
        return;
      }
      if (method === "PATCH" && path.includes("/organizations/mine")) {
        const body = req.postDataJSON() as Partial<typeof org>;
        current = { ...current, ...body };
        await route.fulfill({ json: current });
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

    await page.goto("/organization");
    await expect(page.getByRole("heading", { name: "Orga E2E" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("link", { name: "Modifier" }).click();
    await expect(page).toHaveURL(/\/organization\/edit/);
    await expect(page.getByRole("heading", { name: /Modifier l.organisation/ })).toBeVisible();

    await page.getByLabel(/Nom de l.organisation/).fill("Atelier E2E");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page).toHaveURL(/\/organization$/);
    await expect(page.getByRole("heading", { name: "Atelier E2E" })).toBeVisible();
  });

  test("mentions par défaut puis mention personnalisée", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-org-mentions-token");
    });

    let current = { ...org };

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/auth/me")) {
        await route.fulfill({ json: admin });
        return;
      }
      if (method === "GET" && path.includes("/account/preferences")) {
        await route.fulfill({ json: completedPrefs });
        return;
      }
      if (method === "GET" && path.includes("/organizations/mine")) {
        await route.fulfill({ json: { organizations: [current] } });
        return;
      }
      if (method === "PATCH" && path.includes("/organizations/mine")) {
        const body = req.postDataJSON() as Record<string, unknown>;
        current = { ...current, ...body };
        await route.fulfill({ json: current });
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

    await page.goto("/organization");
    await expect(
      page.getByRole("heading", { name: "Facturation et mentions légales" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Paiement à 30 jours/)).toBeVisible();

    await page.getByRole("link", { name: "Modifier" }).click();
    await expect(
      page.getByRole("heading", { name: /Facturation et mentions légales/ }),
    ).toBeVisible();
    await page.getByLabel("Conditions de paiement").fill("Paiement à 15 jours net");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page).toHaveURL(/\/organization$/);
    await expect(page.getByText("Paiement à 15 jours net")).toBeVisible();
  });

  test("restaurer les mentions par défaut conserve l’identité juridique", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-org-restore-mentions-token");
    });

    let current: Record<string, unknown> = {
      ...org,
      legalForm: "SAS",
      shareCapital: "10 000 €",
      rcsLabel: "RCS Paris 123 456 789",
      vatNumber: "FR11979102803",
      invoiceMentions: { paymentTerms: "Paiement à 15 jours net" },
    };

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/auth/me")) {
        await route.fulfill({ json: admin });
        return;
      }
      if (method === "GET" && path.includes("/account/preferences")) {
        await route.fulfill({ json: completedPrefs });
        return;
      }
      if (method === "GET" && path.includes("/organizations/mine")) {
        await route.fulfill({ json: { organizations: [current] } });
        return;
      }
      if (method === "PATCH" && path.includes("/organizations/mine")) {
        const body = req.postDataJSON() as Record<string, unknown>;
        current = { ...current, ...body };
        await route.fulfill({ json: current });
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

    await page.goto("/organization");
    await expect(page.getByText("Paiement à 15 jours net")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("SAS")).toBeVisible();

    await page.getByRole("link", { name: "Modifier" }).click();
    await expect(page.getByLabel("Conditions de paiement")).toHaveValue(/15 jours/);
    await expect(page.getByLabel("Forme juridique")).toHaveValue("SAS");

    await page.getByRole("button", { name: "Restaurer les mentions par défaut" }).click();
    await expect(page.getByLabel("Conditions de paiement")).toHaveValue(/30 jours/);
    await expect(page.getByLabel("Forme juridique")).toHaveValue("SAS");
    await expect(page.getByLabel("Capital social")).toHaveValue("10 000 €");
    await expect(page.getByLabel("RCS")).toHaveValue("RCS Paris 123 456 789");
    await expect(page.getByLabel("N° TVA intracommunautaire")).toHaveValue("FR11979102803");

    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/organization$/);
    await expect(page.getByText(/Paiement à 30 jours/)).toBeVisible();
    await expect(page.getByText("Paiement à 15 jours net")).toHaveCount(0);
    await expect(page.getByText("SAS")).toBeVisible();
    await expect(page.getByText("10 000 €")).toBeVisible();
    await expect(page.getByText("RCS Paris 123 456 789")).toBeVisible();
    await expect(page.getByText("FR11979102803")).toBeVisible();
  });
});
