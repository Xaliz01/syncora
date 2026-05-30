"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/components/auth/AuthContext";
import { CrispSupport } from "@/components/support/CrispSupport";
import { OrganizationProvider } from "@/lib/organization";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <OrganizationProvider>
                <CrispSupport />
                {children}
              </OrganizationProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
