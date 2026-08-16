import { Suspense } from "react";
import { RegisterPage } from "@/components/auth/RegisterPage";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";

export default function Register() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <RegisterPage />
    </Suspense>
  );
}
