import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { MentionsLegalesContent } from "@/content/legal/mentions-legales";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site et de l'application Planwise.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPageLayout title="Mentions légales">
      <MentionsLegalesContent />
    </LegalPageLayout>
  );
}
