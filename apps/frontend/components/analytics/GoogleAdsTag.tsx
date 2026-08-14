"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useCookieConsentMarketing } from "@/components/legal/CookieConsentBanner";
import { getCookieConsent, hasCookieConsentDecision } from "@/lib/legal/cookie-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function getGoogleAdsId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "";
}

function pushConsentUpdate(granted: boolean) {
  if (typeof window.gtag !== "function") return;
  const value = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  });
}

/**
 * Google Ads (gtag) avec Consent Mode v2 :
 * - la balise est toujours présente (détectable par Google) ;
 * - stockage pub refusé par défaut jusqu’au consentement marketing.
 */
export function GoogleAdsTag() {
  const adsId = getGoogleAdsId();
  const marketingAllowed = useCookieConsentMarketing();

  useEffect(() => {
    if (!adsId) return;
    // Si aucune décision encore : rester sur le default « denied ».
    if (!hasCookieConsentDecision()) return;
    pushConsentUpdate(getCookieConsent()?.marketing === true);
  }, [adsId, marketingAllowed]);

  if (!adsId) return null;

  return (
    <>
      <Script id="google-ads-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500
          });
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-gtag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${adsId}');
        `}
      </Script>
    </>
  );
}
