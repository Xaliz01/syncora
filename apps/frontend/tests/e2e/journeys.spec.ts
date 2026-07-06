import { test, expect } from "@playwright/test";

/** Routes applicatives connues (RequireAuth) — pas le catch-all, qui renvoie vers `/`. */
const PROTECTED_PATHS = ["/fleet/vehicles", "/cases", "/users", "/settings/case-templates"];

test.describe("Accès invité", () => {
  test("la page d'accueil affiche la landing marketing", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        name: "Pilotez vos opérations terrain depuis un seul outil",
      }),
    ).toBeVisible();
  });

  test("les routes protégées redirigent vers la connexion", async ({ page }) => {
    for (const path of PROTECTED_PATHS) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("les pages d'authentification publiques sont accessibles", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Créer votre compte" })).toBeVisible();

    await page.goto("/accept-invitation");
    await expect(page.getByRole("heading", { name: "Rejoindre l'organisation" })).toBeVisible();
  });
});

test.describe("Parcours navigation auth", () => {
  test("enchaîne connexion, inscription et activation invité", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: /Créer une organisation/ }).click();
    await expect(page).toHaveURL(/\/register/);

    await page.getByRole("link", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByRole("link", { name: /Activer votre compte invité/ }).click();
    await expect(page).toHaveURL(/\/accept-invitation/);
  });

  test("préremplit le token d'invitation depuis l'URL", async ({ page }) => {
    await page.goto("/accept-invitation?token=test-token-123");
    await expect(page.getByLabel("Token d'invitation")).toHaveValue("test-token-123");
  });
});

/* ------------------------------------------------------------------ */
/*  Nouveaux tests — ajoutés après les blocs existants                */
/* ------------------------------------------------------------------ */

const ALL_PROTECTED_PATHS = [
  "/organization",
  "/subscription",
  "/account",
  "/search",
  "/stock",
  "/my-day",
  "/customers",
  "/customers/new",
  "/cases",
  "/cases/new",
  "/cases/calendar",
  "/fleet/vehicles",
  "/fleet/vehicles/new",
  "/fleet/teams",
  "/fleet/teams/new",
  "/fleet/technicians",
  "/fleet/technicians/new",
  "/fleet/agences",
  "/fleet/agences/new",
  "/users",
  "/users/new",
  "/settings/case-templates",
  "/settings/case-templates/new",
  "/settings/permissions",
  "/settings/profiles",
  "/settings/profiles/new",
  "/settings/stock/articles",
  "/settings/notifications",
];

test.describe("Protection exhaustive des routes", () => {
  for (const path of ALL_PROTECTED_PATHS) {
    test(`${path} redirige vers /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("Formulaires d'authentification", () => {
  test("le formulaire de connexion contient email, mot de passe et bouton", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  });

  test("le formulaire d'inscription étape 1 contient email, mot de passe et bouton Continuer", async ({
    page,
  }) => {
    await page.goto("/register");
    await expect(page.getByLabel("Email administrateur")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuer" })).toBeVisible();
    await expect(page.getByText("Compte", { exact: true })).toBeVisible();
    await expect(page.getByText("Organisation", { exact: true })).toBeVisible();
  });

  test("l'étape organisation n'est pas accessible sans session onboarding", async ({ page }) => {
    await page.goto("/register?step=organization");
    await expect(page.getByRole("button", { name: "Créer l'organisation" })).toBeDisabled();
    await expect(page.getByText("Session expirée")).toBeVisible();
  });

  test("l'étape organisation affiche les champs d'adresse postale", async ({ page }) => {
    await page.goto("/register?step=organization");
    await expect(page.getByText("Adresse postale")).toBeVisible();
  });

  test("le formulaire d'invitation contient token, mot de passe et bouton", async ({ page }) => {
    await page.goto("/accept-invitation");
    await expect(page.getByLabel("Token d'invitation")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Activer mon compte" })).toBeVisible();
  });
});

test.describe("Soumission formulaire de connexion", () => {
  test("soumettre le formulaire vide ne quitte pas la page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("remplir et soumettre le formulaire reste sur la page sans backend", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Mot de passe").fill("motdepasse123");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Soumission formulaire d'inscription", () => {
  test("soumettre l'étape 1 vide ne quitte pas la page", async ({ page }) => {
    await page.goto("/register");
    // Le bouton est désactivé tant que l'étape 1 n'est pas valide : aucune navigation possible.
    await expect(page.getByRole("button", { name: "Continuer" })).toBeDisabled();
    await expect(page).toHaveURL(/\/register/);
  });

  test("remplir l'étape 1 et vérifier que le bouton est actif", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Email administrateur").fill("admin@acme.fr");
    await page.getByLabel("Mot de passe").fill("secret1234");
    const submitBtn = page.getByRole("button", { name: "Continuer" });
    await expect(submitBtn).toBeEnabled();
  });
});

test.describe("Navigation catch-all", () => {
  test("une route inconnue redirige vers la landing", async ({ page }) => {
    await page.goto("/unknown-page-xyz");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        name: "Pilotez vos opérations terrain depuis un seul outil",
      }),
    ).toBeVisible();
  });

  test("une route imbriquée inconnue redirige vers la landing", async ({ page }) => {
    await page.goto("/fleet/unknown/deep/path");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        name: "Pilotez vos opérations terrain depuis un seul outil",
      }),
    ).toBeVisible();
  });
});

test.describe("Parcours landing publique", () => {
  test("enchaîne landing, inscription et connexion", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Pilotez vos opérations terrain depuis un seul outil",
      }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Démarrer mon essai gratuit" }).first().click();
    await expect(page).toHaveURL(/\/register/);

    await page.goto("/");
    await page.getByRole("link", { name: "Se connecter" }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Route /my-day protégée", () => {
  test("la page Ma journée redirige vers /login sans session", async ({ page }) => {
    await page.goto("/my-day");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Parcours inter-pages publiques complet", () => {
  test("enchaîne login → register → login → accept-invitation → login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

    await page.getByRole("link", { name: /Créer une organisation/ }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole("heading", { name: "Créer votre compte" })).toBeVisible();

    await page.getByRole("link", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

    await page.getByRole("link", { name: /Activer votre compte invité/ }).click();
    await expect(page).toHaveURL(/\/accept-invitation/);
    await expect(page.getByRole("heading", { name: "Rejoindre l'organisation" })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});
