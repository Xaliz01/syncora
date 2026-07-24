/**
 * Routage planwise.fr (landing) vs app.planwise.fr (connexion).
 *
 * Prérequis local (en plus du serveur dev Playwright) :
 *   echo "127.0.0.1 planwise.fr www.planwise.fr app.planwise.fr" | sudo tee -a /etc/hosts
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  APP_HOST,
  BACKOFFICE_HOST,
  MARKETING_HOST,
  WWW_HOST,
  appOrigin,
  appUrl,
  backofficeOrigin,
  isLocalHostRoutingReady,
  marketingOrigin,
  marketingUrl,
  requestWithHost,
} from "./helpers/host-headers";

const LANDING_HEADING = "Pilotez vos opérations terrain depuis un seul outil";

const HOSTS_SETUP_HINT =
  "Ajoutez 127.0.0.1 planwise.fr www.planwise.fr app.planwise.fr dans /etc/hosts (voir en-tête de ce fichier).";

async function skipUnlessHostsReady(request: APIRequestContext) {
  const ready = await isLocalHostRoutingReady(request);
  test.skip(!ready, HOSTS_SETUP_HINT);
}

test.describe("Routage par hostname — redirections middleware", () => {
  test("www.planwise.fr redirige vers l'apex marketing", async ({ request }) => {
    const response = await requestWithHost(request, "/tarifs?ref=ads", WWW_HOST);
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe(`${marketingOrigin()}/tarifs?ref=ads`);
  });

  test("planwise.fr/login redirige vers app.planwise.fr/login", async ({ request }) => {
    const response = await requestWithHost(request, "/login", MARKETING_HOST);
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe(`${appOrigin()}/login`);
  });

  test("planwise.fr/register conserve la query vers le sous-domaine app", async ({ request }) => {
    const response = await requestWithHost(request, "/register?step=organization", MARKETING_HOST);
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe(`${appOrigin()}/register?step=organization`);
  });

  test("app.planwise.fr/ ne redirige pas (login affiché côté client)", async ({ request }) => {
    const response = await requestWithHost(request, "/", APP_HOST);
    expect(response.status()).toBe(200);
  });

  test("planwise.fr/ ne redirige pas (landing)", async ({ request }) => {
    const response = await requestWithHost(request, "/", MARKETING_HOST);
    expect(response.status()).toBe(200);
  });

  test("planwise.fr/mentions-legales reste sur le domaine marketing", async ({ request }) => {
    const response = await requestWithHost(request, "/mentions-legales", MARKETING_HOST);
    expect(response.status()).toBe(200);
  });

  test("planwise.fr/page-inexistante redirige vers le domaine app", async ({ request }) => {
    const response = await requestWithHost(request, "/page-inexistante", MARKETING_HOST);
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe(`${appOrigin()}/page-inexistante`);
  });

  test("backoffice.planwise.fr/ redirige vers /platform", async ({ request }) => {
    const response = await requestWithHost(request, "/", BACKOFFICE_HOST);
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`${backofficeOrigin()}/platform`);
  });

  test("backoffice.planwise.fr/login redirige vers /platform", async ({ request }) => {
    const response = await requestWithHost(request, "/login", BACKOFFICE_HOST);
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`${backofficeOrigin()}/platform`);
  });

  test("app.planwise.fr/platform redirige vers le backoffice", async ({ request }) => {
    const response = await requestWithHost(request, "/platform", APP_HOST);
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`${backofficeOrigin()}/platform`);
  });
});

test.describe("Domaine marketing (planwise.fr)", () => {
  test.beforeAll(async ({ request }) => {
    await skipUnlessHostsReady(request);
  });

  test("la racine affiche la landing marketing", async ({ page }) => {
    await page.goto(marketingUrl("/"));
    await expect(page).toHaveURL(marketingUrl("/"));
    await expect(page.getByRole("heading", { name: LANDING_HEADING })).toBeVisible();
  });
});

test.describe("Domaine app (app.planwise.fr)", () => {
  test.beforeAll(async ({ request }) => {
    await skipUnlessHostsReady(request);
  });

  test("la racine affiche le formulaire de connexion", async ({ page }) => {
    await page.goto(appUrl("/"));
    await expect(page).toHaveURL(appUrl("/"));
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("les routes protégées redirigent vers la connexion", async ({ page }) => {
    for (const path of ["/cases", "/my-day", "/fleet/vehicles"]) {
      await page.goto(appUrl(path));
      // RequireAuth conserve le deep link via ?next=
      await expect(page).toHaveURL(/\/login(\?|$)/);
      expect(new URL(page.url()).hostname).toBe(APP_HOST);
    }
  });

  test("les pages d'authentification restent accessibles", async ({ page }) => {
    await page.goto(appUrl("/login"));
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

    await page.goto(appUrl("/register"));
    await expect(page.getByRole("heading", { name: "Créer votre compte" })).toBeVisible();

    await page.goto(appUrl("/accept-invitation"));
    await expect(page.getByRole("heading", { name: "Rejoindre l'organisation" })).toBeVisible();
  });
});

test.describe("Parcours landing → connexion (domaine marketing)", () => {
  test.beforeAll(async ({ request }) => {
    await skipUnlessHostsReady(request);
  });

  test("la landing propose un lien relatif vers /login (redirigé vers app en prod)", async ({
    page,
    request,
  }) => {
    await page.goto(marketingUrl("/"));
    await expect(page.getByRole("heading", { name: LANDING_HEADING })).toBeVisible();

    const loginLink = page.getByRole("link", { name: "Se connecter" }).first();
    await expect(loginLink).toHaveAttribute("href", "/login");

    const loginRedirect = await requestWithHost(request, "/login", MARKETING_HOST);
    expect(loginRedirect.status()).toBe(308);
    expect(loginRedirect.headers().location).toBe(`${appOrigin()}/login`);
  });
});
