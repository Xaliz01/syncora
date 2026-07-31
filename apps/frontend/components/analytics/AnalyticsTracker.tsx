"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageview } from "@/lib/analytics";

/** Mesure d'audience first-party (landing + app + backoffice). */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    void trackPageview(pathname);
  }, [pathname]);

  return null;
}
