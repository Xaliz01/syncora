import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, NetworkOnly, Serwist } from "serwist";

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
    handler: new NetworkFirst({
      cacheName: "planwise-documents",
      networkTimeoutSeconds: 5,
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

const LEGAL_DOCUMENT_PATHS = new Set([
  "/mentions-legales",
  "/politique-confidentialite",
  "/cgu",
  "/cgv",
  "/politique-cookies",
]);

/** Pages légales : toujours réseau (évite cache SW obsolète → redirect dashboard). */
const legalDocumentCaching: RuntimeCaching[] = [
  {
    matcher({ url, request }) {
      return request.mode === "navigate" && LEGAL_DOCUMENT_PATHS.has(url.pathname);
    },
    handler: new NetworkOnly(),
  },
];

const runtimeCaching: RuntimeCaching[] = [
  ...legalDocumentCaching,
  ...apiCaching,
  ...staticAssetCaching,
  ...defaultCache,
];

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

/* ── Push notifications ───────────────────────────────────────── */

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
}

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: "Planwise", body: event.data.text() };
  }

  const title = payload.title ?? "Planwise";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: payload.icon ?? "/icons/icon-192x192.png",
    badge: payload.badge ?? "/icons/icon-72x72.png",
    data: { url: payload.url ?? "/" },
    tag: `planwise-${Date.now()}`,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const rawUrl = (event.notification.data as { url?: string })?.url ?? "/";
  const url = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const sameOrigin = clientList.filter((client) => client.url.startsWith(self.location.origin));

      for (const client of sameOrigin) {
        if (!("focus" in client)) continue;
        await client.focus();
        if ("navigate" in client) {
          try {
            await (client as WindowClient).navigate(url);
            return;
          } catch {
            /* navigate peut échouer (origine / navigateur) → openWindow */
          }
        }
      }

      await self.clients.openWindow(url);
    })(),
  );
});
