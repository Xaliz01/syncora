import Link from "next/link";
import {
  getLegalContractPartyName,
  getLegalPublisherConfig,
  isEntrepreneurIndividuel,
} from "@/lib/legal/config";
import { LegalList, LegalParagraph, LegalSection } from "@/components/legal/LegalDocument";

export function MentionsLegalesContent() {
  const legal = getLegalPublisherConfig();
  const isEi = isEntrepreneurIndividuel(legal);

  const editorItems = [
    <>
      <strong>{legal.companyName}</strong>
      {legal.legalForm ? ` — ${legal.legalForm}` : null}
    </>,
    <>
      Marque et service commercial : <strong>{legal.publisherName}</strong>
    </>,
    <>Siège : {legal.address}</>,
    <>SIRET : {legal.siret}</>,
    <>Immatriculation : RCS {legal.rcs}</>,
    ...(isEi || !legal.shareCapital.trim() ? [] : [`Capital social : ${legal.shareCapital}`]),
    <>N° TVA intracommunautaire : {legal.vatNumber}</>,
    <>Activité : programmation informatique (6201Z)</>,
    <>
      Contact :{" "}
      <a href={`mailto:${legal.contactEmail}`} className="text-brand-600 underline">
        {legal.contactEmail}
      </a>
    </>,
  ];

  return (
    <>
      <LegalSection title="1. Éditeur du site">
        <LegalParagraph>
          Le site <strong>planwise.fr</strong> et l&apos;application{" "}
          <strong>app.planwise.fr</strong> sont édités par {getLegalContractPartyName(legal)} :
        </LegalParagraph>
        <LegalList items={editorItems} />
        <LegalParagraph>
          Directeur de la publication : {legal.directorOfPublication}.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. Hébergement">
        <LegalParagraph>
          L&apos;infrastructure applicative est hébergée par {legal.hostingProviderName},{" "}
          {legal.hostingProviderAddress}, dans le datacenter OVHcloud de Gravelines (France).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Propriété intellectuelle">
        <LegalParagraph>
          L&apos;ensemble des éléments composant le site et l&apos;application Planwise (textes,
          graphismes, logiciels, marques, logos) est protégé par le droit de la propriété
          intellectuelle. Toute reproduction ou représentation non autorisée est interdite.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="4. Données personnelles">
        <LegalParagraph>
          Pour les traitements de données personnelles, consultez notre{" "}
          <Link href="/politique-confidentialite" className="text-brand-600 underline">
            Politique de confidentialité
          </Link>{" "}
          et notre{" "}
          <Link href="/politique-cookies" className="text-brand-600 underline">
            Politique cookies
          </Link>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Limitation de responsabilité">
        <LegalParagraph>
          {legal.companyName} s&apos;efforce d&apos;assurer l&apos;exactitude des informations
          diffusées sur le site. Toutefois, il ne saurait garantir l&apos;absence d&apos;erreurs ou
          d&apos;interruptions de service. L&apos;utilisation du service est régie par les{" "}
          <Link href="/cgu" className="text-brand-600 underline">
            CGU
          </Link>{" "}
          et les{" "}
          <Link href="/cgv" className="text-brand-600 underline">
            CGV
          </Link>
          .
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
