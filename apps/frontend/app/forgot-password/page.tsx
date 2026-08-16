import { Suspense } from "react";
import { ForgotPasswordPage } from "@/components/auth/ForgotPasswordPage";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";

export default function ForgotPassword() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
