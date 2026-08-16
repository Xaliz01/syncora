import { Suspense } from "react";
import { LoginPage } from "@/components/auth/LoginPage";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";

export default function Login() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <LoginPage />
    </Suspense>
  );
}
