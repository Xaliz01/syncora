import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED } from "@/lib/legal/config";
import { LEGAL_PATHS } from "@/lib/legal/routes";
import { getMarketingOrigin } from "@/lib/host-routing";

function parseFrenchLegalDate(label: string): Date {
  const months: Record<string, number> = {
    janvier: 0,
    février: 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    août: 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    décembre: 11,
  };
  const match = label.trim().match(/^(\d{1,2})\s+([a-zéû]+)\s+(\d{4})$/i);
  if (!match) return new Date();
  const day = Number(match[1]);
  const month = months[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (month === undefined || !day || !year) return new Date();
  return new Date(Date.UTC(year, month, day));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getMarketingOrigin();
  const legalUpdated = parseFrenchLegalDate(LEGAL_LAST_UPDATED);

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...LEGAL_PATHS.map((path) => ({
      url: `${base}${path}`,
      lastModified: legalUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
