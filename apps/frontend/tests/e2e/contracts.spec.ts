import { expect, test } from "./fixtures";

test.describe("Contrats de maintenance — accès invité", () => {
  test("la liste contrats redirige vers la connexion", async ({ page }) => {
    await page.goto("/contracts");
    await expect(page).toHaveURL(/\/login/);
  });

  test("la création de contrat redirige vers la connexion", async ({ page }) => {
    await page.goto("/contracts/new");
    await expect(page).toHaveURL(/\/login/);
  });

  test("le détail contrat redirige vers la connexion", async ({ page }) => {
    await page.goto("/contracts/some-id");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Contrats de maintenance — parcours public", () => {
  test("la landing présente le mode à programmer / rappel", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Contrats de maintenance", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Rappel avant échéance|à programmer|auto-planification/i),
    ).toBeVisible();
  });
});
