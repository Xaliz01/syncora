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

const SIGNUP_CONVERSION_SESSION_KEY = "planwise_gads_signup_conversion";

export function getGoogleAdsId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "";
}

/** Label d’événement (partie après `AW-…/` dans send_to). */
export function getGoogleAdsSignupConversionLabel(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim() ?? "";
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
 * Conversion Google Ads « inscription » — uniquement après création d’organisation réussie.
 * Nécessite `NEXT_PUBLIC_GOOGLE_ADS_ID` + `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`.
 * Consent Mode : l’événement part même sans consentement marketing (modélisation) ;
 * le stockage pub reste régi par le consentement.
 *
 * @returns Promise résolue après envoi (ou timeout court) pour enchaîner une navigation.
 */
export function reportGoogleAdsSignupConversion(opts?: { transactionId?: string }): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const adsId = getGoogleAdsId();
  const label = getGoogleAdsSignupConversionLabel();
  if (!adsId || !label || typeof window.gtag !== "function") {
    return Promise.resolve();
  }

  try {
    if (sessionStorage.getItem(SIGNUP_CONVERSION_SESSION_KEY) === "1") {
      return Promise.resolve();
    }
    sessionStorage.setItem(SIGNUP_CONVERSION_SESSION_KEY, "1");
  } catch {
    // sessionStorage indisponible : on envoie quand même (risque faible de double envoi).
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timeout = window.setTimeout(done, 1000);
    window.gtag!("event", "conversion", {
      send_to: `${adsId}/${label}`,
      ...(opts?.transactionId ? { transaction_id: opts.transactionId } : {}),
      event_callback: () => {
        window.clearTimeout(timeout);
        done();
      },
    });
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
