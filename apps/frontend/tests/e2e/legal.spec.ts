import { test as base, expect as baseExpect } from "@playwright/test";
import { acceptLegalConsent, expect, test } from "./fixtures";

test.describe("Conformité légale — inscription", () => {
  test("l'inscription exige l'acceptation des CGU", async ({ page }) => {
    await page.goto("/register");
    const submit = page.getByRole("button", { name: "Continuer" });
    await expect(submit).toBeDisabled();
    await page.getByLabel("Email administrateur").fill("admin@test.fr");
    await page.getByLabel("Mot de passe", { exact: true }).fill("password123");
    await expect(submit).toBeDisabled();
    await acceptLegalConsent(page);
    await expect(submit).toBeEnabled();
  });
});

base.describe("Conformité légale — pages publiques", () => {
  base("la landing affiche les liens légaux dans le pied de page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Tout accepter" }).click();
    await baseExpect(page.getByRole("link", { name: "Mentions légales" })).toBeVisible();
    await baseExpect(page.getByRole("link", { name: "CGV" })).toBeVisible();
  });

  base("les pages légales sont accessibles", async ({ page }) => {
    await page.goto("/mentions-legales");
    await baseExpect(page.getByRole("heading", { name: "Mentions légales" })).toBeVisible();

    await page.goto("/politique-confidentialite");
    await baseExpect(
      page.getByRole("heading", { name: "Politique de confidentialité" }),
    ).toBeVisible();

    await page.goto("/cgu");
    await baseExpect(
      page.getByRole("heading", { name: /Conditions Générales d'Utilisation/i }),
    ).toBeVisible();

    await page.goto("/cgv");
    await baseExpect(
      page.getByRole("heading", { name: /Conditions Générales de Vente/i }),
    ).toBeVisible();

    await page.goto("/politique-cookies");
    await baseExpect(page.getByRole("heading", { name: "Politique cookies" })).toBeVisible();
  });

  base("le bandeau cookies s'affiche puis disparaît après acceptation", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("dialog", { name: /Cookies et traceurs/i });
    await baseExpect(banner).toBeVisible();
    await page.getByRole("button", { name: "Tout accepter" }).click();
    await baseExpect(banner).not.toBeVisible();
  });
});
