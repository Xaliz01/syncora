"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/components/auth/AuthContext";
import { CrispSupport } from "@/components/support/CrispSupport";
import { OrganizationProvider } from "@/lib/organization";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { ImpersonationBanner } from "@/components/platform/ImpersonationBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <OrganizationProvider>
                <ImpersonationBanner />
                <CrispSupport />
                <PwaInstallBanner />
                <CookieConsentBanner />
                {children}
              </OrganizationProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
