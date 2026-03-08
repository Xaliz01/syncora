"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { HomePage } from "@/components/HomePage";
import { AppShell } from "@/components/layout/AppShell";

export default function Home() {
  return (
    <RequireAuth>
      <AppShell>
        <HomePage />
      </AppShell>
    </RequireAuth>
  );
}
