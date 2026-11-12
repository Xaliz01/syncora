import { expect, test } from "./fixtures";

test.describe("Copilote dictaphone", () => {
  const admin = {
    id: "user-e2e-copilot",
    email: "copilot@example.com",
    name: "Alex Terrain",
    organizationId: "org-e2e",
    role: "admin",
    status: "active",
    permissions: ["subscription.active"],
    isFoundingAdmin: false,
  };

  const proposal = {
    id: "64b1c0c0c0c0c0c0c0c0c0c1",
    organizationId: "org-e2e",
    userId: admin.id,
    userName: "Alex Terrain",
    createdAt: "2026-11-12T10:00:00.000Z",
    transcript: "J'ai remplacé le groupe de sécurité.",
    audioAvailable: false,
    intent: "Compte-rendu",
    status: "pending",
    decision: null,
    actions: [
      {
        id: "a1",
        type: "field_report",
        summary: "Compte-rendu de l'intervention",
        status: "proposed",
        fieldReport: {
          interventionId: "64b1c0c0c0c0c0c0c0c0c0c2",
          reportText: "Le groupe de sécurité a été remplacé. L'eau chaude est rétablie.",
        },
      },
    ],
  };

  async function mockApp(page: import("@playwright/test").Page, user: typeof admin) {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-copilot-token");
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
          json: { hasAccess: true, maxUsers: 5, status: "trialing", activeAddons: [] },
        });
        return;
      }
      if (method === "GET" && path.endsWith("/ai/copilot/quota")) {
        await route.fulfill({
          json: { usage: "copilot_voice", tier: "trial", used: 1, limit: 20, remaining: 19 },
        });
        return;
      }
      if (method === "POST" && path.endsWith("/ai/copilot/sessions")) {
        await route.fulfill({ json: proposal });
        return;
      }
      if (method === "POST" && path.includes("/decide")) {
        await route.fulfill({
          json: {
            ...proposal,
            status: "confirmed",
            decision: "confirmed",
            message: "Actions enregistrées. Aucun envoi au client.",
            actions: [
              {
                ...proposal.actions[0],
                status: "confirmed",
                result: {
                  entityType: "intervention",
                  entityId: "64b1c0c0c0c0c0c0c0c0c0c2",
                  caseId: "64b1c0c0c0c0c0c0c0c0c0c3",
                  label: "Fuite cuisine",
                  href: "/cases/64b1c0c0c0c0c0c0c0c0c3",
                },
              },
            ],
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/ai/copilot/sessions")) {
        await route.fulfill({
          json: {
            total: 1,
            sessions: [
              {
                ...proposal,
                status: "confirmed",
                decision: "confirmed",
                actions: [
                  {
                    ...proposal.actions[0],
                    status: "confirmed",
                    result: {
                      entityType: "intervention",
                      entityId: "64b1c0c0c0c0c0c0c0c0c2",
                      label: "Fuite cuisine",
                      href: "/cases/64b1c0c0c0c0c0c0c0c0c3",
                    },
                  },
                ],
              },
            ],
          },
        });
        return;
      }
      if (method === "GET" && (path.includes("/dashboard") || path.endsWith("/cases"))) {
        await route.fulfill({
          json: { items: [], cases: [], total: 0, interventions: [], todos: [] },
        });
        return;
      }
      await route.fulfill({ status: 200, json: {} });
    });
  }

  test("dicte une instruction, confirme le compte-rendu et le retrouve dans l'historique", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockApp(page, admin);
    await page.goto("/");
    await page.getByRole("button", { name: "Dicter une instruction" }).click();
    const dialog = page.getByRole("dialog", { name: "Dicter une instruction" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Écrire à la place" }).click();
    await dialog.getByLabel("Instruction").fill("J'ai remplacé le groupe de sécurité.");
    await dialog.getByRole("button", { name: "Interpréter" }).click();

    const review = page.getByRole("dialog", { name: "Instruction du copilote" });
    await expect(review.getByText("J'ai remplacé le groupe de sécurité.")).toBeVisible();
    await expect(review.getByText("Compte-rendu de l'intervention")).toBeVisible();
    await review.getByRole("button", { name: "Enregistrer dans le CRM" }).click();
    await expect(review.getByRole("link", { name: "Fuite cuisine" })).toBeVisible();

    await page.goto("/copilote");
    await expect(page.getByRole("heading", { name: "Copilote" })).toBeVisible();
    await expect(page.getByText("J'ai remplacé le groupe de sécurité.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Fuite cuisine" })).toBeVisible();
  });

  test("masque le dictaphone sans le droit copilote", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockApp(page, {
      ...admin,
      id: "user-e2e-member",
      role: "member",
      permissions: ["subscription.active", "cases.read"],
    });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Dicter une instruction" })).toHaveCount(0);
  });
});
