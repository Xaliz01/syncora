import { expect, test } from "./fixtures";

test.describe("Parcours préférences de notification", () => {
  test("la route /settings/notifications redirige vers /login sans session", async ({ page }) => {
    await page.goto("/settings/notifications");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("la route /settings/notifications est protégée par RequireAuth", async ({ page }) => {
    await page.goto("/settings/notifications");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});
