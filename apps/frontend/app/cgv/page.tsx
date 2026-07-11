import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { CgvContent } from "@/content/legal/cgv";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
  description: "CGV et conditions d'abonnement Planwise.",
};

export default function CgvPage() {
  return (
    <LegalPageLayout title="Conditions Générales de Vente (CGV)">
      <CgvContent />
    </LegalPageLayout>
  );
}
