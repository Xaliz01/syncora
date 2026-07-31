import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  getAppOrigin,
  getConfiguredBackofficeHost,
  getConfiguredMarketingHost,
  getMarketingOrigin,
  isAppHost,
  isBackofficeHost,
  isLocalDevHost,
  isMarketingHost,
} from "@/lib/host-routing";

function hostFromHeaders(headerList: Headers): string {
  return (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerList = await headers();
  const host = hostFromHeaders(headerList);

  if (isBackofficeHost(host) || isAppHost(host)) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      host: isAppHost(host) ? getAppOrigin() : `https://${getConfiguredBackofficeHost()}`,
    };
  }

  // Domaine marketing (et localhost en dev) : indexation de la vitrine.
  if (isMarketingHost(host) || isLocalDevHost(host) || !host) {
    return {
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/platform/", "/~offline"],
        },
      ],
      sitemap: `${getMarketingOrigin()}/sitemap.xml`,
      host: getMarketingOrigin(),
    };
  }

  // Hôte inconnu : prudence.
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    host: `https://${getConfiguredMarketingHost()}`,
  };
}
