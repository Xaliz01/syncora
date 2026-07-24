import { expect, test } from "./fixtures";

/**
 * Backoffice plateforme (`/platform`).
 * Parcours invité : garde d’auth staff + formulaire de connexion.
 * L’impersonation authentifiée reste hors E2E (credentials staff / allowlist).
 */
const PLATFORM_PROTECTED = [
  "/platform",
  "/platform/users",
  "/platform/organizations/org-demo",
  "/platform/integrations",
  "/platform/crons",
];

test.describe("Backoffice plateforme — accès invité", () => {
  test("la page de connexion backoffice est accessible", async ({ page }) => {
    await page.goto("/platform/login");
    await expect(page).toHaveURL(/\/platform\/login/);
    await expect(page.getByRole("heading", { name: "Backoffice Planwise" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  });

  test("les routes backoffice sans session redirigent vers la connexion", async ({ page }) => {
    for (const path of PLATFORM_PROTECTED) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/platform\/login/);
    }
  });

  test("un login backoffice refusé affiche une erreur sans entrer dans l’espace", async ({
    page,
  }) => {
    await page.goto("/platform/login");
    await page.getByLabel("Email").fill("client@example.com");
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page.locator("p.text-red-600")).toHaveText(
      /réservé|impossible|incorrect|interdit/i,
      {
        timeout: 15_000,
      },
    );
    await expect(page).toHaveURL(/\/platform\/login/);
  });

  test("le handoff support sans token renvoie vers la connexion app", async ({ page }) => {
    await page.goto("/auth/support-session");
    await expect(page).toHaveURL(/\/login/);
  });
});
