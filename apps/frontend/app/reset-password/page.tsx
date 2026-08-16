import { Suspense } from "react";
import { ResetPasswordPage } from "@/components/auth/ResetPasswordPage";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";

export default function ResetPassword() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ResetPasswordPage />
    </Suspense>
  );
}
