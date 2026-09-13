import { expect, test } from "./fixtures";
import type { Route } from "@playwright/test";

const staff = {
  id: "staff-e2e",
  email: "staff@planwise.fr",
  name: "Staff E2E",
};

const template = {
  id: "tpl-relance",
  name: "Relance beta",
  purpose: "prospect_outreach",
  subject: "Suite Planwise",
  body: "Bonjour",
  footer: "Planwise",
  ctaLabel: "Découvrir Planwise",
  ctaUrl: "/",
  isDefault: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const firstSend = {
  sentAt: "2026-07-01T10:00:00.000Z",
  subject: "Premier contact",
  templateId: "tpl-1",
  templateName: "Prospection beta",
  toEmail: "dupont@example.fr",
  sentByUserId: staff.id,
  sentByEmail: staff.email,
  status: "sent" as const,
};

function trackedRow(
  overrides: Partial<{
    id: string;
    siren: string;
    companyName: string;
    email: string;
    status: "sent" | "noted";
    emailSends: (typeof firstSend)[];
  }> = {},
) {
  return {
    id: overrides.id ?? "o-1",
    siren: overrides.siren ?? "123456789",
    companyName: overrides.companyName ?? "Plomberie Dupont",
    email: overrides.email ?? "dupont@example.fr",
    sentByUserId: staff.id,
    sentByEmail: staff.email,
    subject: "Premier contact",
    status: overrides.status ?? "sent",
    sentAt: "2026-07-01T10:00:00.000Z",
    emailSends: overrides.emailSends ?? [firstSend],
  };
}

test.describe("Prospection backoffice — envoi groupé", () => {
  test("sélection, annulation, envoi groupé et historique conservé", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_platform_token", "e2e-staff-token");
    });

    let outreaches = [
      trackedRow(),
      trackedRow({
        id: "o-2",
        siren: "987654321",
        companyName: "Élec Martin",
        email: "martin@example.fr",
        status: "noted",
        emailSends: [],
      }),
    ];
    const bulkBodies: Array<{ templateId?: string; recipients?: Array<{ siren: string }> }> = [];

    await page.route("**/api/**", async (route: Route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/platform/me")) {
        await route.fulfill({ json: staff });
        return;
      }
      if (method === "GET" && path.includes("/platform/prospects/credits")) {
        await route.fulfill({ json: { configured: false } });
        return;
      }
      if (method === "GET" && path.includes("/platform/email-templates")) {
        await route.fulfill({ json: { templates: [template], total: 1 } });
        return;
      }
      if (method === "GET" && path.includes("/platform/prospects/tracked")) {
        await route.fulfill({
          json: {
            outreaches,
            total: outreaches.length,
            limit: 50,
            offset: 0,
          },
        });
        return;
      }
      if (method === "POST" && path.includes("/platform/prospects/outreach/bulk")) {
        const body = req.postDataJSON() as {
          templateId?: string;
          recipients?: Array<{ siren: string }>;
        };
        bulkBodies.push(body);
        const now = "2026-09-13T18:00:00.000Z";
        outreaches = outreaches.map((row) => {
          if (!body.recipients?.some((r) => r.siren === row.siren)) return row;
          return {
            ...row,
            status: "sent" as const,
            subject: "Suite Planwise",
            sentAt: now,
            emailSends: [
              ...(row.emailSends ?? []),
              {
                sentAt: now,
                subject: "Suite Planwise",
                templateId: template.id,
                templateName: template.name,
                toEmail: row.email,
                sentByUserId: staff.id,
                sentByEmail: staff.email,
                status: "sent" as const,
              },
            ],
          };
        });
        await route.fulfill({
          json: {
            sent: body.recipients?.length ?? 0,
            failed: 0,
            skipped: 0,
            results: (body.recipients ?? []).map((r) => ({ siren: r.siren, status: "sent" })),
          },
        });
        return;
      }
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto("/platform/prospection");
    await expect(page.getByRole("heading", { name: "Prospection" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Plomberie Dupont")).toBeVisible();
    await expect(page.getByText("Élec Martin")).toBeVisible();

    await page.getByRole("checkbox", { name: "Sélectionner la page courante" }).check();
    await expect(page.getByText("2 sélectionnés")).toBeVisible();
    await page.getByRole("checkbox", { name: "Sélectionner Élec Martin" }).uncheck();
    await expect(page.getByText("1 sélectionné")).toBeVisible();

    await page.getByRole("button", { name: "Envoyer la sélection" }).click();
    await expect(page.getByRole("heading", { name: "Envoyer la sélection" })).toBeVisible();
    await page.getByRole("button", { name: "Annuler" }).click();
    expect(bulkBodies).toHaveLength(0);

    await page.getByRole("checkbox", { name: "Sélectionner Élec Martin" }).check();
    await page.getByPlaceholder("contact@…").nth(1).fill("");
    await page.getByRole("button", { name: "Envoyer la sélection" }).click();
    await expect(page.getByText(/1 ligne sans e-mail valide/)).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText(/Envoi groupé : 1 envoyé · 0 échecs · 1 ignoré/)).toBeVisible({
      timeout: 10_000,
    });
    expect(bulkBodies[0]?.templateId).toBe(template.id);
    expect(bulkBodies[0]?.recipients?.map((r) => r.siren)).toEqual(["123456789"]);

    await page.getByRole("button", { name: "Historique" }).first().click();
    const historyDialog = page.getByRole("dialog", { name: /Historique — Plomberie Dupont/ });
    await expect(historyDialog).toBeVisible();
    await expect(historyDialog.getByText("Prospection beta")).toBeVisible();
    await expect(historyDialog.getByText("Relance beta", { exact: true })).toBeVisible();
  });

  test("au-delà de 200 résultats filtrés, invite à affiner sans tout sélectionner", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_platform_token", "e2e-staff-token");
    });

    await page.route("**/api/**", async (route: Route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/platform/me")) {
        await route.fulfill({ json: staff });
        return;
      }
      if (method === "GET" && path.includes("/platform/prospects/credits")) {
        await route.fulfill({ json: { configured: false } });
        return;
      }
      if (method === "GET" && path.includes("/platform/email-templates")) {
        await route.fulfill({ json: { templates: [template], total: 1 } });
        return;
      }
      if (method === "GET" && path.includes("/platform/prospects/tracked")) {
        await route.fulfill({
          json: {
            outreaches: [trackedRow()],
            total: 201,
            limit: 50,
            offset: 0,
          },
        });
        return;
      }
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto("/platform/prospection");
    await expect(page.getByRole("heading", { name: "Prospection" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Plus de 200 résultats/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Sélectionner les \d+ \(filtrés\)/ }),
    ).toHaveCount(0);
  });
});
