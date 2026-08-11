import { expect, test } from "./fixtures";

test.describe("Assistant Planwise", () => {
  const user = {
    id: "user-e2e-assistant",
    email: "assistant@example.com",
    name: "Alex Assistant",
    organizationId: "org-e2e",
    role: "admin",
    status: "active",
    permissions: ["subscription.active", "customers.read", "cases.read", "organizations.read"],
    isFoundingAdmin: false,
  };

  test("ouvre le panneau, pose une question et suit un lien suggéré", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-assistant-token");
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
      if (method === "POST" && path.includes("/assistant/chat")) {
        await route.fulfill({
          json: {
            conversationId: "conv-e2e",
            reply: "Le planning est disponible depuis le menu Suivi.",
            suggestions: [{ label: "Planning", href: "/cases/calendar" }],
            escalateToSupport: false,
          },
        });
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
    await expect(page.getByRole("button", { name: "Assistant Planwise" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Assistant Planwise" }).click();
    const dialog = page.getByRole("dialog", { name: "Assistant Planwise" });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Votre question").fill("où est le planning ?");
    await dialog.getByRole("button", { name: "Envoyer" }).click();

    await expect(dialog.getByText(/Le planning est disponible/i)).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole("link", { name: "Planning" }).click();
    await expect(page).toHaveURL(/\/cases\/calendar/, { timeout: 15_000 });
  });
});
