import type { Metadata } from "next";
import { headers } from "next/headers";
import { HomeClient } from "./HomeClient";
import { MarketingJsonLd } from "@/components/seo/MarketingJsonLd";
import { isLocalDevHost, isMarketingHost } from "@/lib/host-routing";
import { SEO_DEFAULT_DESCRIPTION, SEO_DEFAULT_TITLE } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: SEO_DEFAULT_TITLE,
  },
  description: SEO_DEFAULT_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
};

export default async function Home() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const hostname = host.split(",")[0].trim().split(":")[0].toLowerCase();
  const showMarketingJsonLd = isMarketingHost(hostname) || isLocalDevHost(hostname) || !hostname;

  return (
    <>
      {showMarketingJsonLd ? <MarketingJsonLd /> : null}
      <HomeClient />
    </>
  );
}
