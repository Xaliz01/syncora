"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { trackPageview } from "@/lib/analytics";

/** Mesure d'audience first-party (landing + app ; hors backoffice et comptes de test). */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    if (!pathname) return;
    void trackPageview(pathname, { userEmail: user?.email });
  }, [pathname, user?.email]);

  return null;
}
