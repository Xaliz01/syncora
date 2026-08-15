import { acceptLegalConsent, expect, test } from "./fixtures";
import { assertLiveBackendReachable } from "./helpers/live-api";

/**
 * Parcours réel contre le backend local (pas de mock API).
 * Prérequis : `npm run backend` + front sur :5173, puis `npm run e2e:live`.
 */
test.describe("Inscription live → organisation → essai → onboarding", () => {
  test.beforeEach(async ({ request }) => {
    test.skip(process.env.E2E_LIVE !== "1", "Définir E2E_LIVE=1 (npm run e2e:live)");
    try {
      await assertLiveBackendReachable(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      test.skip(true, `Backend injoignable — lancer \`npm run backend\`. (${message})`);
    }
  });

  test("crée un compte, une organisation, active l’essai et termine l’onboarding", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const stamp = Date.now();
    const email = `e2e.signup.${stamp}@planwise.test`;
    const password = "Secret12";
    const orgName = `E2E Orga ${stamp}`;
    // 14 chiffres uniques (pas de contrainte Luhn côté API).
    const siret = `9${String(stamp).slice(-13).padStart(13, "0")}`;

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Créer votre compte" })).toBeVisible();

    await page.getByLabel("Votre nom (optionnel)").fill("E2E Fondateur");
    await page.getByLabel("Email administrateur").fill(email);
    await page.getByLabel("Mot de passe").fill(password);
    await acceptLegalConsent(page);
    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page.getByRole("heading", { name: "Vérifiez votre e-mail" })).toBeVisible({
      timeout: 30_000,
    });
    // En non-prod le code debug est prérempli / affiché.
    const codeInput = page.getByLabel("Code de vérification");
    await expect(codeInput).toHaveValue(/\d{6}/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Vérifier mon e-mail" }).click();

    await expect(page.getByRole("heading", { name: "Créer votre organisation" })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("combobox", { name: "SIRET" }).fill(siret);
    await page.getByLabel("Nom de l'organisation").fill(orgName);
    await page.getByLabel("E-mail de facturation").fill(email);

    await page
      .getByRole("button", { name: /Saisie manuelle \(hors répertoire ou correction libre\)/i })
      .click();
    await page.getByPlaceholder("12 rue de la République").fill("12 rue de la République");
    await page.getByPlaceholder("75001").fill("75001");
    await page.getByPlaceholder("Paris").fill("Paris");

    await page.getByRole("button", { name: "Créer l'organisation" }).click();

    await expect(page).toHaveURL(/\/subscription/, { timeout: 45_000 });
    await page
      .getByRole("button", { name: /Activer l.essai/ })
      .first()
      .click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 60_000 });
    await expect(
      page.getByRole("heading", { name: "Comment utilisez-vous Planwise ?" }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /Bureau uniquement/i }).click();
    await expect(
      page.getByRole("heading", { name: "Charger des données de démonstration ?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Continuer sans données de démo/i }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Bienvenue dans Planwise" })).toBeVisible({
      timeout: 30_000,
    });
  });
});
