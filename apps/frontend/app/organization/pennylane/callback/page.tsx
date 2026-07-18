"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Ancienne URL OAuth — redirige vers /settings/integrations/pennylane/callback. */
function LegacyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/settings/integrations/pennylane/callback${qs ? `?${qs}` : ""}`);
  }, [router, searchParams]);

  return <p className="p-8 text-center text-sm text-slate-500">Redirection…</p>;
}

export default function LegacyPennylaneCallbackPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-slate-500">Redirection…</p>}>
      <LegacyRedirect />
    </Suspense>
  );
}
