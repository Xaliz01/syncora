import { test, expect } from "./fixtures";

test.describe("Parcours suivi facturation", () => {
  test("la page facturation redirige sans session", async ({ page }) => {
    await page.goto("/billing");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("créer une facture depuis un dossier protège la route sans session", async ({ page }) => {
    await page.goto("/cases/case-demo");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});
