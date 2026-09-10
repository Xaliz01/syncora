"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Ancienne page Paramètres → Intégrations : la facturation est dans Planwise. */
export function IntegrationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/billing");
  }, [router]);

  return (
    <p className="text-sm text-slate-500 dark:text-slate-400">Redirection vers Facturation…</p>
  );
}
