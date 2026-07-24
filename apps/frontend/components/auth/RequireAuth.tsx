"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import {
  hasActiveSubscriptionAccess,
  isOrganizationSubscriptionRoute,
} from "@/lib/subscription-access";
import { buildLoginHref } from "@/lib/auth-return-url";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const subscriptionOk = hasActiveSubscriptionAccess(user);

  React.useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      const returnPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : pathname;
      router.replace(buildLoginHref(returnPath));
    }
  }, [isReady, isAuthenticated, router, pathname]);

  React.useEffect(() => {
    if (!isReady || !isAuthenticated || !user) return;
    if (subscriptionOk) return;
    if (isOrganizationSubscriptionRoute(pathname)) return;
    router.replace("/subscription");
  }, [isReady, isAuthenticated, user, pathname, router, subscriptionOk]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500 dark:text-slate-400">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user && !subscriptionOk && !isOrganizationSubscriptionRoute(pathname)) {
    return null;
  }

  return <>{children}</>;
}
