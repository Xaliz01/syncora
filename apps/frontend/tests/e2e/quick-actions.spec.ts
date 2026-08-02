import { expect, test } from "./fixtures";

test.describe("Parcours actions rapides (garde auth)", () => {
  test("le tableau de bord reste protégé sans session", async ({ page }) => {
    await page.goto("/");
    // Invité : landing marketing (pas le dashboard app)
    await expect(
      page.getByRole("heading", {
        name: "Le CRM terrain abordable pour indépendants, artisans et TPE",
      }),
    ).toBeVisible();
  });

  test("la personnalisation des préférences compte est protégée", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});
