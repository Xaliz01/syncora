import { test, expect } from "./fixtures";

test.describe("Parcours suivi facturation", () => {
  test("la page facturation redirige sans session", async ({ page }) => {
    await page.goto("/billing");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});
