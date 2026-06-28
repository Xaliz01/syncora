import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

const APP_NAME = "Planwise";
const APP_TITLE = "Planwise CRM";
const APP_DESCRIPTION = "CRM des opérations terrain";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_TITLE,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#4338ca",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
