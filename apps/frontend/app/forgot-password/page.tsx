import { Suspense } from "react";
import { ForgotPasswordPage } from "@/components/auth/ForgotPasswordPage";

export default function ForgotPassword() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}
    >
      <ForgotPasswordPage />
    </Suspense>
  );
}
