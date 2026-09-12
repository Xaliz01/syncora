import { expect, test } from "./fixtures";
import type { Route } from "@playwright/test";

const foundingAdmin = {
  id: "user-e2e-quotes",
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
    "quotes.read",
    "quotes.send",
  ],
  isFoundingAdmin: false,
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
  id: "case-demo-quote",
  organizationId: "org-e2e",
  title: "Dossier devis",
  status: "open",
  billingStatus: "none",
  priority: "medium",
  assignees: [],
  tags: [],
  steps: [],
  progress: 0,
  interventionCount: 0,
  customerId: "cust-1",
  customer: {
    id: "cust-1",
    displayName: "Client SA",
    kind: "company",
    email: "client@example.com",
  },
};

function draftQuote() {
  return {
    id: "quote-send",
    organizationId: "org-e2e",
    caseId: demoCase.id,
    quoteNumber: "DEV-2026-0001",
    status: "draft",
    totalHt: 120,
    totalTva: 24,
    totalTtc: 144,
    emailSends: [] as unknown[],
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

test.describe("Envoi de devis", () => {
  test("envoyer un devis : annuler puis confirmer avec destinataire modifié", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-quote-send-token");
    });

    const quote = draftQuote();
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
      if (await mockAppShell(route)) return;
      if (method === "POST" && path.includes("/cases/quotes/quote-send/send")) {
        sendCalls += 1;
        const body = req.postDataJSON() as { to?: string };
        lastSendTo = body.to;
        quote.status = "sent";
        quote.emailSends = [
          {
            sentAt: "2026-09-12T12:00:00.000Z",
            to: body.to ?? "client@example.com",
            sentByUserId: foundingAdmin.id,
            sentByName: foundingAdmin.name,
            status: "sent",
          },
        ];
        await route.fulfill({ json: quote });
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

    await page.goto(`/cases/${demoCase.id}`);
    await expect(page.getByText(demoCase.title).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByRole("heading", { name: "Envoyer le devis" })).toBeVisible();
    await expect(page.getByText("Le PDF du devis sera joint.")).toBeVisible();
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByRole("heading", { name: "Envoyer le devis" })).toHaveCount(0);
    expect(sendCalls).toBe(0);

    await page.getByRole("button", { name: "Envoyer" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Destinataire")).toHaveValue("client@example.com");
    await dialog.getByLabel("Destinataire").fill("autre-client@example.com");
    await dialog.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText(/Devis envoyé/i)).toBeVisible({ timeout: 10_000 });
    expect(sendCalls).toBe(1);
    expect(lastSendTo).toBe("autre-client@example.com");
  });

  test("sans quotes.send : historique visible, Envoyer masqué", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-quote-send-token");
    });

    const readOnlyUser = {
      ...foundingAdmin,
      role: "member" as const,
      isFoundingAdmin: false,
      permissions: foundingAdmin.permissions.filter((code) => code !== "quotes.send"),
    };
    const quote = {
      ...draftQuote(),
      status: "sent",
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
        await route.fulfill({ json: { interventions: [], total: 0 } });
        return;
      }
      if (method === "GET" && path.includes("/cases/quotes")) {
        await route.fulfill({ json: [quote] });
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
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto(`/cases/${demoCase.id}`);
    await expect(page.getByText(demoCase.title).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Envoyé le/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Envoyer" })).toHaveCount(0);
  });
});
