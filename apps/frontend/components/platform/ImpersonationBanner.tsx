"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { getBackofficeOrigin, isLocalDevHost } from "@/lib/host-routing";

export function ImpersonationBanner() {
  const { user, isImpersonating, endImpersonationSession } = useAuth();
  if (!isImpersonating || !user) return null;

  const handleExit = () => {
    endImpersonationSession();
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const destination = isLocalDevHost(host) ? "/platform" : `${getBackofficeOrigin()}/platform`;
    window.location.href = destination;
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-100 px-4 py-2 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          Mode support — vous agissez en tant que <strong>{user.name || user.email}</strong>
          {user.impersonatorEmail ? <> (agent : {user.impersonatorEmail})</> : null}. Session
          limitée à 45 minutes. Toute action est auditée.
        </p>
        <button
          type="button"
          onClick={handleExit}
          className="rounded-md bg-amber-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-900 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          Quitter le mode support
        </button>
      </div>
    </div>
  );
}
