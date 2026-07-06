import { test, expect } from "@playwright/test";

test.describe("Parcours préférences de notification", () => {
  test("la route /settings/notifications redirige vers /login sans session", async ({ page }) => {
    await page.goto("/settings/notifications");
    await expect(page).toHaveURL(/\/login/);
  });

  test("la route /settings/notifications est protégée par RequireAuth", async ({ page }) => {
    await page.goto("/settings/notifications");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});
