import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { CguContent } from "@/content/legal/cgu";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "CGU du service SaaS Planwise.",
};

export default function CguPage() {
  return (
    <LegalPageLayout title="Conditions Générales d'Utilisation (CGU)">
      <CguContent />
    </LegalPageLayout>
  );
}
