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
  transpilePackages: ["@syncora/shared"],
  // Sortie autonome pour un runtime Docker minimal (serveur Node + deps tracées).
  output: "standalone",
  // Monorepo : tracer les dépendances depuis la racine du repo (inclut @syncora/shared).
  outputFileTracingRoot: join(__dirname, "../../"),
};

export default withSerwist(nextConfig);
