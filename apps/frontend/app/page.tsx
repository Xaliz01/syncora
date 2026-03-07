"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { HomePage } from "@/components/HomePage";

export default function Home() {
  return (
    <RequireAuth>
      <HomePage />
    </RequireAuth>
  );
}
