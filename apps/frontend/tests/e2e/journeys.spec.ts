import { test, expect } from "@playwright/test";

const PROTECTED_PATHS = [
  "/",
  "/fleet/vehicles",
  "/cases",
  "/users",
  "/settings/case-templates",
  "/route-inconnue",
];

test.describe("Accès invité", () => {
  test("les routes protégées redirigent vers la connexion", async ({ page }) => {
    for (const path of PROTECTED_PATHS) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("les pages d'authentification publiques sont accessibles", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Créer votre organisation" })).toBeVisible();

    await page.goto("/accept-invitation");
    await expect(page.getByRole("heading", { name: "Rejoindre l'organisation" })).toBeVisible();
  });
});

test.describe("Parcours navigation auth", () => {
  test("enchaîne connexion, inscription et activation invité", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: /Créer une organisation/ }).click();
    await expect(page).toHaveURL(/\/register/);

    await page.getByRole("link", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByRole("link", { name: /Activer votre compte invité/ }).click();
    await expect(page).toHaveURL(/\/accept-invitation/);
  });

  test("préremplit le token d'invitation depuis l'URL", async ({ page }) => {
    await page.goto("/accept-invitation?token=test-token-123");
    await expect(page.getByLabel("Token d'invitation")).toHaveValue("test-token-123");
  });
});
