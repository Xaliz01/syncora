import { test, expect } from "./fixtures";

test.describe("Parcours intégration Qonto", () => {
  test("la page intégrations redirige sans session", async ({ page }) => {
    await page.goto("/settings/integrations");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("le callback OAuth Qonto redirige sans session", async ({ page }) => {
    await page.goto("/settings/integrations/qonto/callback?code=x&state=y");
    await expect(page).toHaveURL(/\/login/);
  });
});
