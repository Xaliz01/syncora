import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const apiCaching: RuntimeCaching[] = [
  {
    matcher({ url, request }) {
      return (
        url.pathname.includes("/cases/interventions") &&
        request.method === "GET" &&
        !url.pathname.includes("/report")
      );
    },
    handler: new NetworkFirst({
      cacheName: "planwise-interventions",
      networkTimeoutSeconds: 5,
      matchOptions: { ignoreSearch: false },
      plugins: [
        {
          cacheKeyWillBeUsed: async ({ request }) => {
            return request.url;
          },
        },
      ],
    }),
  },
  {
    matcher({ url, request }) {
      return url.pathname.includes("/documents/") && request.method === "GET";
    },
    handler: new StaleWhileRevalidate({
      cacheName: "planwise-documents",
      plugins: [
        {
          cacheKeyWillBeUsed: async ({ request }) => {
            return request.url;
          },
        },
      ],
    }),
  },
  {
    matcher({ url, request }) {
      return url.pathname.includes("/auth/me") && request.method === "GET";
    },
    handler: new NetworkFirst({
      cacheName: "planwise-auth",
      networkTimeoutSeconds: 3,
    }),
  },
];

const staticAssetCaching: RuntimeCaching[] = [
  {
    matcher({ request }) {
      return request.destination === "image";
    },
    handler: new CacheFirst({
      cacheName: "planwise-images",
      plugins: [
        {
          cacheKeyWillBeUsed: async ({ request }) => {
            return request.url;
          },
        },
      ],
    }),
  },
];

const runtimeCaching: RuntimeCaching[] = [...apiCaching, ...staticAssetCaching, ...defaultCache];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
