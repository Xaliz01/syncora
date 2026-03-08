import { test, expect } from "@playwright/test";

test.describe("Navigation and redirects", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unknown routes redirect to login for unauthenticated users", async ({ page }) => {
    await page.goto("/some-unknown-route");
    await expect(page).toHaveURL(/\/login/);
  });

  test("fleet routes redirect to login for unauthenticated users", async ({ page }) => {
    await page.goto("/fleet/vehicles");
    await expect(page).toHaveURL(/\/login/);
  });

  test("users routes redirect to login for unauthenticated users", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL(/\/login/);
  });

  test("cases routes redirect to login for unauthenticated users", async ({ page }) => {
    await page.goto("/cases");
    await expect(page).toHaveURL(/\/login/);
  });

  test("settings routes redirect to login for unauthenticated users", async ({ page }) => {
    await page.goto("/settings/case-templates");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page is accessible without authentication", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("register page is accessible without authentication", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: "Créer votre organisation" })
    ).toBeVisible();
  });

  test("accept invitation page is accessible without authentication", async ({ page }) => {
    await page.goto("/accept-invitation");
    await expect(page).toHaveURL(/\/accept-invitation/);
    await expect(
      page.getByRole("heading", { name: "Rejoindre l'organisation" })
    ).toBeVisible();
  });

  test("navigation between login and register works both ways", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /Créer une organisation/ }).click();
    await expect(page).toHaveURL(/\/register/);

    await page.getByRole("link", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Page metadata", () => {
  test("page has correct title", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Syncora/);
  });

  test("page has correct language attribute", async ({ page }) => {
    await page.goto("/login");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "fr");
  });
});
