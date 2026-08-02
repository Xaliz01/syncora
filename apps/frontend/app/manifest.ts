import type { MetadataRoute } from "next";
import { SEO_DEFAULT_DESCRIPTION, SEO_SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SEO_SITE_NAME} — CRM accessible aux artisans et TPE`,
    short_name: SEO_SITE_NAME,
    description: SEO_DEFAULT_DESCRIPTION,
    start_url: "/login",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#4338ca",
    icons: [
      { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      {
        src: "/icons/icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: "/icons/icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    categories: ["business", "productivity"],
  };
}
