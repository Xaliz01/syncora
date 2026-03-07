import { test, expect } from "@playwright/test";

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  await expect(page.getByText("Syncora")).toBeVisible();
  await expect(page.getByText("CRM des opérations terrain")).toBeVisible();
});

test("login page has register link", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("link", { name: /Créer une organisation/ })).toBeVisible();
});
