import { spawnSync } from "node:child_process";
import { join } from "node:path";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  transpilePackages: ["@planwise/shared"],
  // Sortie autonome pour un runtime Docker minimal (serveur Node + deps tracées).
  output: "standalone",
  // Monorepo : tracer les dépendances depuis la racine du repo (inclut @planwise/shared).
  outputFileTracingRoot: join(__dirname, "../../"),
  async headers() {
    return [
      {
        source: "/mentions-legales",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/politique-confidentialite",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/cgu",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/cgv",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/politique-cookies",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default withSerwist(nextConfig);
