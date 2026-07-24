import { Suspense } from "react";
import { LoginPage } from "@/components/auth/LoginPage";

export default function Login() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}
    >
      <LoginPage />
    </Suspense>
  );
}
