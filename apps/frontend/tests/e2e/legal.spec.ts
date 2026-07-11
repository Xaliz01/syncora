import { test, expect } from "@playwright/test";

test.describe("Conformité légale — pages publiques", () => {
  test("la landing affiche les liens légaux dans le pied de page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Mentions légales" })).toBeVisible();
    await expect(page.getByRole("link", { name: "CGV" })).toBeVisible();
  });

  test("les pages légales sont accessibles", async ({ page }) => {
    await page.goto("/mentions-legales");
    await expect(page.getByRole("heading", { name: "Mentions légales" })).toBeVisible();

    await page.goto("/politique-confidentialite");
    await expect(page.getByRole("heading", { name: "Politique de confidentialité" })).toBeVisible();

    await page.goto("/cgu");
    await expect(
      page.getByRole("heading", { name: /Conditions Générales d'Utilisation/i }),
    ).toBeVisible();

    await page.goto("/cgv");
    await expect(
      page.getByRole("heading", { name: /Conditions Générales de Vente/i }),
    ).toBeVisible();

    await page.goto("/politique-cookies");
    await expect(page.getByRole("heading", { name: "Politique cookies" })).toBeVisible();
  });

  test("le bandeau cookies s'affiche puis disparaît après acceptation", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("dialog", { name: /Cookies et traceurs/i });
    await expect(banner).toBeVisible();
    await page.getByRole("button", { name: "Tout accepter" }).click();
    await expect(banner).not.toBeVisible();
  });

  test("l'inscription exige l'acceptation des CGU", async ({ page }) => {
    await page.goto("/register");
    const submit = page.getByRole("button", { name: "Continuer" });
    await expect(submit).toBeDisabled();
    await page.getByLabel(/J'accepte les/i).check();
    await page.getByLabel("Email administrateur").fill("admin@test.fr");
    await page.getByLabel("Mot de passe", { exact: true }).fill("password123");
    await expect(submit).toBeEnabled();
  });
});
