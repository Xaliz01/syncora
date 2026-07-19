import { acceptLegalConsent, expect, test } from "./fixtures";

test.describe("Parcours commentaires (garde auth)", () => {
  test("les pages dossier et ma journée restent protégées", async ({ page }) => {
    for (const path of ["/cases", "/my-day", "/cases/new"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("depuis la landing, le parcours mène à la connexion pour accéder aux dossiers", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Se connecter/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("l'inscription reste accessible avant d'utiliser les commentaires", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Créer votre compte" })).toBeVisible();
    await page.getByLabel("Email administrateur").fill("artisan@exemple.fr");
    await page.getByLabel("Mot de passe").fill("motdepasse123");
    await acceptLegalConsent(page);
    await expect(page.getByRole("button", { name: "Continuer" })).toBeEnabled();
  });
});
