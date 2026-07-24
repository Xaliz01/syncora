"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { useOrganization } from "@/lib/organization";

/**
 * Deep links push/email portent `?organizationId=` : bascule l’org de session
 * si l’utilisateur y a accès, puis retire le paramètre de l’URL.
 */
export function DeepLinkOrganizationSync() {
  const { isAuthenticated, isReady } = useAuth();
  const {
    sessionOrganizationId,
    organizations,
    isLoading,
    isSwitchingOrganization,
    selectOrganization,
  } = useOrganization();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const attemptedRef = useRef<string | null>(null);

  const orgFromLink = searchParams.get("organizationId")?.trim() || null;

  useEffect(() => {
    if (!isReady || !isAuthenticated || isLoading || isSwitchingOrganization) return;
    if (!orgFromLink) return;

    const stripOrgParam = () => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("organizationId");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    };

    if (orgFromLink === sessionOrganizationId) {
      stripOrgParam();
      return;
    }

    if (attemptedRef.current === orgFromLink) return;
    if (!organizations.some((o) => o.id === orgFromLink)) return;

    attemptedRef.current = orgFromLink;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("organizationId");
    const qs = next.toString();
    const redirectTo = qs ? `${pathname}?${qs}` : pathname;
    void selectOrganization(orgFromLink, { redirectTo });
  }, [
    isReady,
    isAuthenticated,
    isLoading,
    isSwitchingOrganization,
    orgFromLink,
    sessionOrganizationId,
    organizations,
    selectOrganization,
    searchParams,
    pathname,
    router,
  ]);

  return null;
}
