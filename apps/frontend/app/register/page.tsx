import { Suspense } from "react";
import { RegisterPage } from "@/components/auth/RegisterPage";

export default function Register() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}
    >
      <RegisterPage />
    </Suspense>
  );
}
