import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("displays the login form with required fields", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  });

  test("displays Syncora branding", async ({ page }) => {
    await expect(page.getByText("Syncora")).toBeVisible();
    await expect(page.getByText("CRM des opérations terrain")).toBeVisible();
  });

  test("has a link to register page", async ({ page }) => {
    const registerLink = page.getByRole("link", { name: /Créer une organisation/ });
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("has a link to accept invitation page", async ({ page }) => {
    const invitationLink = page.getByRole("link", { name: /Activer votre compte invité/ });
    await expect(invitationLink).toBeVisible();
    await invitationLink.click();
    await expect(page).toHaveURL(/\/accept-invitation/);
  });

  test("email field requires valid email format", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("password field is of type password", async ({ page }) => {
    const passwordInput = page.getByLabel("Mot de passe");
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("submit button is disabled while loading", async ({ page }) => {
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Mot de passe").fill("password123");
    const submitButton = page.getByRole("button", { name: "Se connecter" });
    await expect(submitButton).toBeEnabled();
  });
});

test.describe("Register page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("displays the registration form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Créer votre organisation" })
    ).toBeVisible();
  });

  test("has all required registration fields", async ({ page }) => {
    await expect(page.getByLabel("Nom de l'organisation")).toBeVisible();
    await expect(page.getByLabel(/Votre nom/)).toBeVisible();
    await expect(page.getByLabel("Email administrateur")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Créer l'organisation/ })
    ).toBeVisible();
  });

  test("has a link back to login", async ({ page }) => {
    const loginLink = page.getByRole("link", { name: "Se connecter" });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("password field requires minimum 8 characters", async ({ page }) => {
    const passwordInput = page.getByLabel("Mot de passe");
    await expect(passwordInput).toHaveAttribute("minlength", "8");
  });

  test("organization name is required", async ({ page }) => {
    const orgInput = page.getByLabel("Nom de l'organisation");
    await expect(orgInput).toHaveAttribute("required", "");
  });

  test("admin email is required", async ({ page }) => {
    const emailInput = page.getByLabel("Email administrateur");
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(emailInput).toHaveAttribute("type", "email");
  });
});

test.describe("Accept invitation page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accept-invitation");
  });

  test("displays the invitation form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Rejoindre l'organisation" })
    ).toBeVisible();
  });

  test("has all required invitation fields", async ({ page }) => {
    await expect(page.getByLabel("Token d'invitation")).toBeVisible();
    await expect(page.getByLabel(/Nom/)).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Activer mon compte" })
    ).toBeVisible();
  });

  test("token field is required", async ({ page }) => {
    const tokenInput = page.getByLabel("Token d'invitation");
    await expect(tokenInput).toHaveAttribute("required", "");
  });

  test("prefills token from URL query parameter", async ({ page }) => {
    await page.goto("/accept-invitation?token=test-token-123");
    const tokenInput = page.getByLabel("Token d'invitation");
    await expect(tokenInput).toHaveValue("test-token-123");
  });
});
