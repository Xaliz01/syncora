import { test, expect } from "@playwright/test";

test.describe("PWA — manifest et page hors-ligne", () => {
  test("le manifest est servi avec les métadonnées Planwise", async ({ page }) => {
    const res = await page.request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();

    expect(manifest.short_name).toBe("Planwise");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#4338ca");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  test("la page hors-ligne affiche le message et le bouton réessayer", async ({ page }) => {
    await page.goto("/~offline");
    await expect(page.getByRole("heading", { name: "Hors connexion" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });

  test("les icônes PWA sont accessibles", async ({ page }) => {
    for (const size of ["192x192", "512x512"]) {
      const res = await page.request.get(`/icons/icon-${size}.png`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
    }
  });

  test("le layout inclut les métadonnées PWA", async ({ page }) => {
    await page.goto("/");
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute("content", "#4338ca");

    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleTouchIcon).toHaveAttribute("href", "/icons/icon-192x192.png");

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
  });
});
