"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/lib/auth-permissions";
import { DashboardPage } from "@/components/DashboardPage";

export function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  if (user && !hasPermission(user, "cases.read")) {
    router.replace("/my-day");
    return null;
  }

  return <DashboardPage />;
}
