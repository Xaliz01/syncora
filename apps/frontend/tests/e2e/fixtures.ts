import { test as base, expect } from "@playwright/test";

const COOKIE_CONSENT_STORAGE_KEY = "planwise_cookie_consent";

/** Évite que le bandeau cookies intercepte les clics (login, register, liens). */
export const test = base.extend({
  context: async ({ context }, runWithContext) => {
    await context.addInitScript((storageKey) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          necessary: true,
          support: false,
          decidedAt: "2000-01-01T00:00:00.000Z",
        }),
      );
    }, COOKIE_CONSENT_STORAGE_KEY);
    await runWithContext(context);
  },
});

export { expect };

/** Coche l'acceptation CGU / confidentialité (étape 1 inscription ou invitation). */
export async function acceptLegalConsent(
  page: import("@playwright/test").Page,
  checkboxId = "legal-consent",
) {
  await page.locator(`#${checkboxId}`).check();
}
