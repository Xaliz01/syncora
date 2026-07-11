import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { PolitiqueConfidentialiteContent } from "@/content/legal/politique-confidentialite";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité et protection des données personnelles — Planwise.",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalPageLayout title="Politique de confidentialité">
      <PolitiqueConfidentialiteContent />
    </LegalPageLayout>
  );
}
