import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Syncora CRM",
  description: "CRM des opérations terrain"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="bg-slate-950 text-slate-100">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
