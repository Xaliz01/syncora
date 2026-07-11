import Link from "next/link";
import { getLegalContractPartyName, getLegalPublisherConfig } from "@/lib/legal/config";
import { LegalList, LegalParagraph, LegalSection } from "@/components/legal/LegalDocument";

export function CguContent() {
  const legal = getLegalPublisherConfig();

  return (
    <>
      <LegalSection title="1. Objet">
        <LegalParagraph>
          Les présentes Conditions Générales d&apos;Utilisation (« CGU ») encadrent l&apos;accès et
          l&apos;utilisation de la plateforme <strong>{legal.publisherName}</strong>, proposée par{" "}
          {getLegalContractPartyName(legal)}, par tout utilisateur disposant d&apos;un compte
          (administrateur ou membre d&apos;une organisation cliente).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. Description du service">
        <LegalParagraph>
          {legal.publisherName} est un CRM orienté opérations terrain permettant notamment de gérer
          des clients, dossiers, interventions, équipes, stocks et documents associés. Les
          fonctionnalités peuvent évoluer ; les CGU applicables sont celles en vigueur à la date
          d&apos;utilisation.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Création de compte">
        <LegalList
          items={[
            "L'inscription nécessite des informations exactes (email, organisation, SIRET le cas échéant).",
            "L'administrateur est responsable des comptes qu'il crée ou invite au sein de son organisation.",
            "Les identifiants sont personnels et confidentiels ; leur communication à des tiers est interdite.",
            "L'utilisateur s'engage à notifier sans délai toute utilisation non autorisée de son compte.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Usage acceptable">
        <LegalParagraph>L&apos;utilisateur s&apos;engage à ne pas :</LegalParagraph>
        <LegalList
          items={[
            "Porter atteinte à la sécurité ou à l'intégrité du service.",
            "Extraire massivement des données ou contourner les limitations techniques.",
            "Uploader des contenus illicites, diffamatoires ou portant atteinte aux droits de tiers.",
            "Utiliser le service pour envoyer du spam ou des communications non sollicitées.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Données et contenus">
        <LegalParagraph>
          Le Client reste propriétaire des données qu&apos;il saisit dans le service. Il garantit
          disposer des bases légales nécessaires pour traiter les données de ses propres clients
          (clients finaux, signataires, techniciens, etc.), conformément au RGPD.
        </LegalParagraph>
        <LegalParagraph>
          {legal.companyName} accorde au Client une licence d&apos;utilisation non exclusive, non
          transférable et révocable, limitée à la durée de l&apos;abonnement.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="6. Disponibilité et maintenance">
        <LegalParagraph>
          {legal.publisherName} peut faire l&apos;objet d&apos;interruptions pour maintenance, mises
          à jour ou cas de force majeure. Des sauvegardes régulières sont effectuées ; le Client
          reste néanmoins responsable de la qualité et de la licéité des données qu&apos;il importe
          ou exporte.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. Propriété intellectuelle">
        <LegalParagraph>
          Le logiciel, la marque {legal.publisherName}, la documentation et l&apos;interface restent
          la propriété exclusive de {legal.companyName}. Aucune cession de droits de propriété
          intellectuelle n&apos;est consentie au-delà du droit d&apos;usage prévu aux présentes.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="8. Suspension et résiliation">
        <LegalParagraph>
          En cas de violation des CGU, de non-paiement (voir{" "}
          <Link href="/cgv" className="text-brand-600 underline">
            CGV
          </Link>
          ) ou d&apos;obligation légale, {legal.companyName} peut suspendre ou résilier l&apos;accès
          après notification lorsque la situation le permet. Le Client peut cesser d&apos;utiliser
          le service conformément aux CGV.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="9. Responsabilité">
        <LegalParagraph>
          Le service est fourni « en l&apos;état ». Dans les limites autorisées par la loi, la
          responsabilité de {legal.companyName} est plafonnée conformément aux CGV.
          L&apos;utilisateur est seul responsable de l&apos;usage qu&apos;il fait du service et des
          décisions prises sur la base des informations affichées.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="10. Données personnelles">
        <LegalParagraph>
          Le traitement des données est décrit dans la{" "}
          <Link href="/politique-confidentialite" className="text-brand-600 underline">
            Politique de confidentialité
          </Link>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="11. Modifications">
        <LegalParagraph>
          {legal.companyName} peut modifier les présentes CGU. Les utilisateurs seront informés en
          cas de changement substantiel. La poursuite de l&apos;utilisation vaut acceptation des
          nouvelles conditions.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="12. Droit applicable">
        <LegalParagraph>
          Les CGU sont régies par le droit français. Les{" "}
          <Link href="/cgv" className="text-brand-600 underline">
            CGV
          </Link>{" "}
          s&apos;appliquent aux aspects contractuels et tarifaires.
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
