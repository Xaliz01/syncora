import { test, expect } from "./fixtures";

test.describe("Parcours intégration Pennylane", () => {
  test("la page intégrations redirige sans session", async ({ page }) => {
    await page.goto("/settings/integrations");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("le callback OAuth Pennylane redirige sans session", async ({ page }) => {
    await page.goto("/settings/integrations/pennylane/callback?code=x&state=y");
    await expect(page).toHaveURL(/\/login/);
  });
});
