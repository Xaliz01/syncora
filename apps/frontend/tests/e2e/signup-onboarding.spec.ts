import { acceptLegalConsent, expect, test } from "./fixtures";

/**
 * Parcours UI complet inscription → orga → essai → onboarding (API mockée).
 * Couvre la garde RequireAuth (prefs) sans backend — tourne en CI.
 */
test.describe("Parcours inscription → onboarding (mock API)", () => {
  test("enchaîne compte, organisation, essai et onboarding sans données de démo", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const email = "nouveau@exemple.fr";
    const debugCode = "424242";

    const foundingAdmin = {
      id: "user-signup-e2e",
      email,
      name: "Nouveau Fondateur",
      organizationId: "org-signup-e2e",
      role: "admin" as const,
      status: "active" as const,
      permissions: [] as string[],
      isFoundingAdmin: true,
    };

    let phase: "guest" | "onboarding" | "org" | "trial" | "onboarded" = "guest";
    let onboardingProfileCompleted = false;

    const prefs = () => ({
      userId: foundingAdmin.id,
      preferences: {
        theme: "light",
        sidebarCollapsed: "expanded",
        voiceFieldEnabled: false,
        quickActions: [
          { id: "qa_default_case_new", href: "/cases/new", label: "Nouveau dossier" },
          { id: "qa_default_cases_list", href: "/cases", label: "Tous les dossiers" },
          { id: "qa_default_calendar", href: "/cases/calendar", label: "Planning" },
          {
            id: "qa_default_case_templates",
            href: "/settings/case-templates",
            label: "Modèles de dossier",
          },
        ],
        onboardingCompletedOrganizationIds: onboardingProfileCompleted
          ? [foundingAdmin.organizationId]
          : [],
        onboardingProfileCompleted,
        setupGuideDismissedOrganizationIds: [],
        setupGuideDismissed: false,
      },
    });

    const subscriptionPayload = (opts: { status: "none" | "trialing"; hasAccess: boolean }) => ({
      organizationId: foundingAdmin.organizationId,
      status: opts.status,
      hasAccess: opts.hasAccess,
      trialEndsAt: opts.hasAccess ? new Date(Date.now() + 14 * 864e5).toISOString() : null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      planName: "Essentiel",
      planLabel: "29 € / mois",
      activeAddons: [],
      addonQuantities: {},
      includedUsers: 2,
      maxUsers: 2,
      storageQuotaBytes: 1_000_000_000,
      storageUsedBytes: 0,
      storageWarning: false,
      includedStorageBytes: 1_000_000_000,
      monthlyTotalCents: null,
      monthlyTotalCurrency: null,
      hasStripeSubscription: false,
      billingOpen: false,
      canExtendTrial: false,
      trialExtensionCount: 0,
      maxTrialExtensions: 2,
    });

    const me = () => ({
      ...foundingAdmin,
      permissions:
        phase === "trial" || phase === "onboarded"
          ? [
              "subscription.active",
              "subscriptions.manage_billing",
              "organizations.read",
              "customers.create",
              "customers.read",
            ]
          : phase === "org"
            ? ["subscriptions.manage_billing", "organizations.read"]
            : [],
    });

    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, "") || url.pathname;
      const method = req.method();

      if (method === "POST" && path.includes("/auth/register-account")) {
        await route.fulfill({
          json: {
            status: "email_verification_required",
            email,
            debugVerificationCode: debugCode,
          },
        });
        return;
      }
      if (method === "POST" && path.includes("/auth/verify-email")) {
        phase = "onboarding";
        await route.fulfill({
          json: {
            accessToken: "e2e-onboarding-token",
            user: {
              id: foundingAdmin.id,
              email,
              name: foundingAdmin.name,
              status: "active",
            },
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/auth/onboarding/me")) {
        await route.fulfill({
          json: {
            id: foundingAdmin.id,
            email,
            name: foundingAdmin.name,
            status: "active",
          },
        });
        return;
      }
      if (method === "POST" && path.includes("/auth/create-organization")) {
        phase = "org";
        await route.fulfill({
          json: {
            accessToken: "e2e-access-token",
            user: me(),
          },
        });
        return;
      }
      if (method === "GET" && path.endsWith("/auth/me")) {
        if (phase === "guest" || phase === "onboarding") {
          await route.fulfill({ status: 401, json: { message: "Non authentifié" } });
          return;
        }
        await route.fulfill({ json: me() });
        return;
      }
      if (method === "GET" && path.includes("/subscriptions/current")) {
        await route.fulfill({
          json: subscriptionPayload({
            status: phase === "org" ? "none" : "trialing",
            hasAccess: phase === "trial" || phase === "onboarded",
          }),
        });
        return;
      }
      if (method === "POST" && path.includes("/subscriptions/start-trial")) {
        phase = "trial";
        await route.fulfill({
          json: subscriptionPayload({ status: "trialing", hasAccess: true }),
        });
        return;
      }
      if (method === "GET" && path.includes("/account/preferences")) {
        // Petite latence pour exercer l’overlay / la garde prefs.
        await new Promise((r) => setTimeout(r, 80));
        await route.fulfill({ json: prefs() });
        return;
      }
      if (method === "POST" && path.includes("/account/onboarding-profile")) {
        onboardingProfileCompleted = true;
        phase = "onboarded";
        await route.fulfill({ json: { preferences: prefs().preferences } });
        return;
      }
      if (method === "GET" && path.includes("/organizations/mine")) {
        await route.fulfill({
          json: {
            organizations: [{ id: foundingAdmin.organizationId, name: "Orga Signup E2E" }],
          },
        });
        return;
      }
      if (method === "GET" && path.includes("/organizations/siret-lookup")) {
        await route.fulfill({ json: { results: [] } });
        return;
      }
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Créer votre compte" })).toBeVisible();

    await page.getByLabel("Votre nom (optionnel)").fill("Nouveau Fondateur");
    await page.getByLabel("Email administrateur").fill(email);
    await page.getByLabel("Mot de passe").fill("Secret12");
    await acceptLegalConsent(page);
    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page.getByRole("heading", { name: "Vérifiez votre e-mail" })).toBeVisible();
    await expect(page.getByLabel("Code de vérification")).toHaveValue(debugCode);
    await page.getByRole("button", { name: "Vérifier mon e-mail" }).click();

    await expect(page.getByRole("heading", { name: "Créer votre organisation" })).toBeVisible();
    await page.getByRole("combobox", { name: "SIRET" }).fill("12345678901234");
    await page.getByLabel("Nom de l'organisation").fill("Orga Signup E2E");
    await page.getByLabel("E-mail de facturation").fill(email);
    await page
      .getByRole("button", { name: /Saisie manuelle \(hors répertoire ou correction libre\)/i })
      .click();
    await page.getByPlaceholder("12 rue de la République").fill("1 rue de Test");
    await page.getByPlaceholder("75001").fill("75001");
    await page.getByPlaceholder("Paris").fill("Paris");
    await expect(page.getByRole("button", { name: "Créer l'organisation" })).toBeEnabled();
    await page.getByRole("button", { name: "Créer l'organisation" }).click();

    await expect(page).toHaveURL(/\/subscription/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Mon abonnement" })).toBeVisible();
    await page
      .getByRole("button", { name: /Activer l.essai/ })
      .first()
      .click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Comment utilisez-vous Planwise ?" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Bureau uniquement/i }).click();
    await expect(
      page.getByRole("heading", { name: "Charger des données de démonstration ?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Continuer sans données de démo/i }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Bienvenue dans Planwise" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
