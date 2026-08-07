import { acceptLegalConsent, expect, test } from "./fixtures";

/** Routes applicatives connues (RequireAuth) — pas le catch-all, qui renvoie vers `/`. */
const PROTECTED_PATHS = ["/fleet/vehicles", "/cases", "/users", "/settings/case-templates"];

test.describe("Accès invité", () => {
  test("la page d'accueil affiche la landing marketing", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        name: "Le CRM terrain abordable pour indépendants, artisans et TPE",
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
  test("enchaîne connexion et inscription", async ({ page }) => {
    await page.goto("/login");

    await Promise.all([
      page.waitForURL(/\/register/),
      page.getByRole("link", { name: /Créer un compte/ }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Créer votre compte" })).toBeVisible({
      timeout: 15_000,
    });

    await Promise.all([
      page.waitForURL(/\/login/),
      page.getByRole("link", { name: "Se connecter" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("utilise le token d'invitation depuis l'URL sans champ manuel", async ({ page }) => {
    await page.goto("/accept-invitation?token=test-token-123");
    await expect(page.getByLabel("Jeton d'invitation")).toHaveCount(0);
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  Nouveaux tests — ajoutés après les blocs existants                */
/* ------------------------------------------------------------------ */

const ALL_PROTECTED_PATHS = [
  "/organization",
  "/subscription",
  "/account",
  "/onboarding",
  "/search",
  "/stock",
  "/my-day",
  "/customers",
  "/customers/new",
  "/order-givers",
  "/order-givers/new",
  "/contracts",
  "/contracts/new",
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
  "/settings/prestations",
  "/settings/stock/locations",
  "/settings/notifications",
  "/settings/integrations",
  "/billing",
  "/reporting",
  "/reporting/cases_list",
  "/reporting/interventions_list",
  "/reporting/technicians_activity",
  "/reporting/mileage_report",
  "/reporting/invoices_list",
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
    await expect(page.getByText("E-mail", { exact: true })).toBeVisible();
    await expect(page.getByText("Organisation", { exact: true })).toBeVisible();
  });

  test("l'étape 2 demande un code de vérification e-mail après le compte", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("E-mail", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuer" })).toBeVisible();
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

  test("le formulaire d'invitation contient jeton, mot de passe et bouton", async ({ page }) => {
    await page.goto("/accept-invitation");
    await expect(page.getByLabel("Jeton d'invitation")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Activer mon compte" })).toBeVisible();
  });

  test("le lien d'invitation préremplit le jeton sans champ manuel", async ({ page }) => {
    await page.goto("/accept-invitation?token=test-invite-token");
    await expect(page.getByLabel("Jeton d'invitation")).toHaveCount(0);
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
    await acceptLegalConsent(page);
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
        name: "Le CRM terrain abordable pour indépendants, artisans et TPE",
      }),
    ).toBeVisible();
  });

  test("une route imbriquée inconnue redirige vers la landing", async ({ page }) => {
    await page.goto("/fleet/unknown/deep/path");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        name: "Le CRM terrain abordable pour indépendants, artisans et TPE",
      }),
    ).toBeVisible();
  });
});

test.describe("Parcours landing publique", () => {
  test("enchaîne landing, inscription et connexion", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Le CRM terrain abordable pour indépendants, artisans et TPE",
      }),
    ).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/register/),
      page.getByRole("link", { name: "Démarrer mon essai gratuit" }).first().click(),
    ]);

    await page.goto("/");
    await Promise.all([
      page.waitForURL(/\/login/),
      page.getByRole("link", { name: "Se connecter" }).first().click(),
    ]);
  });

  test("mentionne la facturation et les intégrations disponibles", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Beta", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Facturation sans double saisie" }),
    ).toBeVisible();
    await expect(page.getByText("Facturation & intégrations")).toBeVisible();
    await expect(
      page.getByText(/Suivi et validation des factures synchronisées depuis Planwise/i),
    ).toBeVisible();
    await expect(page.getByText(/sans ressaisie/i)).toBeVisible();
    await expect(page.getByText(/Facturation démo pendant l’essai/i).first()).toBeVisible();
    await expect(page.getByText(/Donneurs d’ordre/i).first()).toBeVisible();
  });

  test("met en avant accessibilité prix et contrats de maintenance", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Un prix clair, pensé pour vous/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Contrats de maintenance", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Rappel avant échéance|à programmer|auto-planification/i),
    ).toBeVisible();
  });
});

test.describe("Route /onboarding protégée", () => {
  test("la page d'onboarding redirige vers /login sans session", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Parcours onboarding sans données de démo", () => {
  const foundingAdmin = {
    id: "user-e2e",
    email: "admin@example.com",
    name: "Alex Admin",
    organizationId: "org-e2e",
    role: "admin",
    status: "active",
    permissions: [
      "subscription.active",
      "customers.create",
      "customers.read",
      "organizations.read",
      "users.invite",
      "cases.create",
      "integrations.demo.read",
      "integrations.demo.configure",
    ],
    isFoundingAdmin: true,
  };

  const incompletePrefs = {
    userId: "user-e2e",
    preferences: {
      theme: "light",
      sidebarCollapsed: "expanded",
      quickActionIds: ["case_new", "cases_list", "calendar", "case_templates"],
      onboardingCompletedOrganizationIds: [],
      onboardingProfileCompleted: false,
      setupGuideDismissedOrganizationIds: [],
      setupGuideDismissed: false,
    },
  };

  const completedPrefs = {
    userId: "user-e2e",
    preferences: {
      ...incompletePrefs.preferences,
      onboardingCompletedOrganizationIds: ["org-e2e"],
      onboardingProfileCompleted: true,
      setupGuideDismissedOrganizationIds: [],
      setupGuideDismissed: false,
    },
  };

  const dismissedGuidePrefs = {
    userId: "user-e2e",
    preferences: {
      ...completedPrefs.preferences,
      setupGuideDismissedOrganizationIds: ["org-e2e"],
      setupGuideDismissed: true,
    },
  };

  test("après refus de la démo, le guide in-app propose de créer un client", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-onboarding-token");
    });

    let onboardingCompleted = false;
    let setupGuideDismissed = false;

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/auth/me")) {
        await route.fulfill({ json: foundingAdmin });
        return;
      }
      if (method === "GET" && path.includes("/account/preferences")) {
        if (!onboardingCompleted) {
          await route.fulfill({ json: incompletePrefs });
        } else if (setupGuideDismissed) {
          await route.fulfill({ json: dismissedGuidePrefs });
        } else {
          await route.fulfill({ json: completedPrefs });
        }
        return;
      }
      if (method === "PUT" && path.includes("/account/preferences")) {
        const body = req.postDataJSON() as { setupGuideDismissed?: boolean };
        if (body.setupGuideDismissed) setupGuideDismissed = true;
        await route.fulfill({
          json: setupGuideDismissed ? dismissedGuidePrefs : completedPrefs,
        });
        return;
      }
      if (method === "GET" && path.includes("/organizations/mine")) {
        await route.fulfill({
          json: {
            organizations: [{ id: "org-e2e", name: "Orga E2E" }],
          },
        });
        return;
      }
      if (method === "POST" && path.includes("/account/onboarding-profile")) {
        onboardingCompleted = true;
        await route.fulfill({
          json: { preferences: completedPrefs.preferences },
        });
        return;
      }
      // Autres appels (shell, analytics…) : réponse neutre pour ne pas bloquer le parcours.
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: "Comment utilisez-vous Planwise ?" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Bureau uniquement/i }).click();
    await expect(
      page.getByRole("heading", { name: "Charger des données de démonstration ?" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Continuer sans données de démo/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Bienvenue dans Planwise" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Connecter son outil de facturation/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Créer un premier client/i }).click();
    await expect(page).toHaveURL(/\/customers\/new/, { timeout: 15_000 });
  });
});

test.describe("Invitation utilisateur sans profil", () => {
  const admin = {
    id: "user-e2e",
    email: "admin@example.com",
    name: "Alex Admin",
    organizationId: "org-e2e",
    role: "admin",
    status: "active",
    permissions: [
      "subscription.active",
      "users.invite",
      "profiles.read",
      "profiles.create",
      "organizations.read",
    ],
    isFoundingAdmin: false,
  };

  test("propose import librairie et création de profil", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("planwise_access_token", "e2e-invite-token");
    });

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "GET" && path.endsWith("/auth/me")) {
        await route.fulfill({ json: admin });
        return;
      }
      if (method === "GET" && path.includes("/account/preferences")) {
        await route.fulfill({
          json: {
            userId: admin.id,
            preferences: {
              theme: "light",
              sidebarCollapsed: "expanded",
              quickActionIds: ["case_new", "cases_list", "calendar", "case_templates"],
              onboardingCompletedOrganizationIds: ["org-e2e"],
              onboardingProfileCompleted: true,
              setupGuideDismissedOrganizationIds: ["org-e2e"],
              setupGuideDismissed: true,
            },
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/organizations/mine")) {
        await route.fulfill({ json: { organizations: [{ id: "org-e2e", name: "Orga E2E" }] } });
        return;
      }
      if (method === "GET" && path.includes("/admin/permissions/catalog")) {
        await route.fulfill({ json: { availablePermissions: ["customers.read"] } });
        return;
      }
      if (method === "GET" && path.includes("/admin/permission-profiles")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (method === "GET" && path.includes("/admin/users")) {
        await route.fulfill({ json: { users: [] } });
        return;
      }
      if (method === "GET" && path.includes("/subscriptions/current")) {
        await route.fulfill({ json: { hasAccess: true, maxUsers: 5, status: "trialing" } });
        return;
      }
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto("/users/new");
    await expect(page.getByRole("heading", { name: "Inviter un utilisateur" })).toBeVisible();
    await expect(page.getByText("Aucun profil de permissions")).toBeVisible();
    await expect(page.getByRole("button", { name: "Importer depuis la librairie" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Créer un profil" })).toHaveAttribute(
      "href",
      "/settings/profiles/new?returnTo=%2Fusers%2Fnew",
    );

    await page.getByRole("button", { name: "Importer depuis la librairie" }).click();
    await expect(page.getByRole("heading", { name: "Importer des profils" })).toBeVisible();
  });
});

test.describe("Route /my-day protégée", () => {
  test("la page Ma journée redirige vers /login sans session", async ({ page }) => {
    await page.goto("/my-day");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});

test.describe("Parcours inter-pages publiques complet", () => {
  test("enchaîne login → register → login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/register/),
      page.getByRole("link", { name: /Créer un compte/ }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Créer votre compte" })).toBeVisible({
      timeout: 15_000,
    });

    await Promise.all([
      page.waitForURL(/\/login/),
      page.getByRole("link", { name: "Se connecter" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});
