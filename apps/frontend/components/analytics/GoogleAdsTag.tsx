"use client";

import Script from "next/script";
import { useCookieConsentMarketing } from "@/components/legal/CookieConsentBanner";

export function getGoogleAdsId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "";
}

/** Charge gtag Google Ads uniquement après consentement marketing. */
export function GoogleAdsTag() {
  const adsId = getGoogleAdsId();
  const allowed = useCookieConsentMarketing();

  if (!adsId || !allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-gtag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${adsId}');
        `}
      </Script>
    </>
  );
}
