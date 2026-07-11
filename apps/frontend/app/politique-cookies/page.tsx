import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { PolitiqueCookiesContent } from "@/content/legal/politique-cookies";

export const metadata: Metadata = {
  title: "Politique cookies",
  description: "Politique cookies et gestion du consentement — Planwise.",
};

export default function PolitiqueCookiesPage() {
  return (
    <LegalPageLayout title="Politique cookies">
      <PolitiqueCookiesContent />
    </LegalPageLayout>
  );
}
