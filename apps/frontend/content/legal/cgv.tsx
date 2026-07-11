import Link from "next/link";
import {
  ADDON_CATALOG,
  BASE_SUBSCRIPTION_PLAN,
  BASE_SUBSCRIPTION_INCLUDED_USERS,
} from "@planwise/shared";
import { getLegalContractPartyName, getLegalPublisherConfig } from "@/lib/legal/config";
import { LegalList, LegalParagraph, LegalSection } from "@/components/legal/LegalDocument";

export function CgvContent() {
  const legal = getLegalPublisherConfig();
  const plan = BASE_SUBSCRIPTION_PLAN;

  return (
    <>
      <LegalSection title="1. Objet">
        <LegalParagraph>
          Les présentes Conditions Générales de Vente (« CGV ») régissent la souscription et
          l&apos;utilisation payante du service SaaS <strong>{legal.publisherName}</strong>, proposé
          par {getLegalContractPartyName(legal)}, auprès de clients professionnels (artisans, TPE,
          PME).
        </LegalParagraph>
        <LegalParagraph>
          Les{" "}
          <Link href="/cgu" className="text-brand-600 underline">
            Conditions Générales d&apos;Utilisation
          </Link>{" "}
          (CGU) complètent les présentes CGV pour l&apos;usage du service.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. Offres et tarifs">
        <LegalParagraph>
          L&apos;offre principale « {plan.name} » est proposée au tarif de{" "}
          <strong>
            {plan.priceDisplay} HT / {plan.periodDisplay}
          </strong>
          , incluant {BASE_SUBSCRIPTION_INCLUDED_USERS} utilisateurs. Des options complémentaires
          (addons) peuvent être souscrites séparément, notamment :
        </LegalParagraph>
        <LegalList
          items={Object.values(ADDON_CATALOG).map((addon) => (
            <span key={addon.code}>
              {addon.label} — {addon.priceLabel}
            </span>
          ))}
        />
        <LegalParagraph>
          Les prix sont indiqués en euros hors taxes. La TVA applicable est ajoutée selon la
          réglementation en vigueur au moment de la facturation.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Essai gratuit">
        <LegalParagraph>
          Un essai gratuit de {plan.trialDays} jours peut être proposé sans obligation de paiement
          immédiat. À l&apos;issue de l&apos;essai, la souscription est convertie en abonnement
          payant uniquement si le Client valide un moyen de paiement via Stripe Checkout ou le
          portail client Stripe.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="4. Commande et paiement">
        <LegalParagraph>
          La commande est conclue lors de la validation du paiement sur la page sécurisée Stripe.
          Les paiements récurrents sont prélevés mensuellement. Les factures sont mises à
          disposition via le portail client Stripe et/ou par email.
        </LegalParagraph>
        <LegalParagraph>
          En cas de défaut de paiement, {legal.publisherName} se réserve le droit de suspendre
          l&apos;accès au service après notification, conformément aux délais légaux.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Durée et résiliation">
        <LegalParagraph>
          L&apos;abonnement est conclu pour une durée indéterminée, {plan.commitmentDisplay}. Le
          Client peut résilier à tout moment depuis le portail client Stripe ; la résiliation prend
          effet à la fin de la période de facturation en cours. Aucun remboursement au prorata
          n&apos;est dû pour la période entamée, sauf disposition légale impérative contraire.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="6. Droit de rétractation">
        <LegalParagraph>
          Le Client est un professionnel agissant dans le cadre de son activité. Conformément à
          l&apos;article L221-3 du Code de la consommation, le droit de rétractation des
          consommateurs ne s&apos;applique pas. Le Client reconnaît expressément renoncer à ce droit
          lors de la souscription.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. Obligations du Client">
        <LegalList
          items={[
            "Fournir des informations exactes lors de l'inscription (SIRET, coordonnées).",
            "Respecter les CGU et la réglementation applicable à ses propres clients finaux.",
            "S'assurer que les utilisateurs invités disposent des autorisations nécessaires.",
            "Ne pas utiliser le service à des fins illicites ou contraires à l'ordre public.",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Disponibilité et support">
        <LegalParagraph>
          {legal.publisherName} vise une disponibilité élevée du service, sans garantie de
          disponibilité absolue. Le support est accessible via le chat intégré (Crisp) et par email
          à{" "}
          <a href={`mailto:${legal.contactEmail}`} className="text-brand-600 underline">
            {legal.contactEmail}
          </a>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="9. Responsabilité">
        <LegalParagraph>
          La responsabilité de {legal.companyName} est limitée aux dommages directs prouvés, dans la
          limite du montant des sommes effectivement versées par le Client au cours des douze (12)
          derniers mois. En aucun cas {legal.companyName} ne pourra être tenue responsable des
          pertes de données imputables au Client, des dommages indirects ou de l&apos;usage du
          service par des tiers.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="10. Données personnelles">
        <LegalParagraph>
          {legal.companyName} agit en qualité de responsable de traitement pour les données des
          comptes utilisateurs et de sous-traitant pour les données que le Client saisit concernant
          ses propres clients. Voir la{" "}
          <Link href="/politique-confidentialite" className="text-brand-600 underline">
            Politique de confidentialité
          </Link>
          . Un accord de sous-traitance (DPA) peut être fourni sur demande à{" "}
          <a href={`mailto:${legal.dpoEmail}`} className="text-brand-600 underline">
            {legal.dpoEmail}
          </a>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="11. Droit applicable et litiges">
        <LegalParagraph>
          Les présentes CGV sont soumises au droit français. En cas de litige, et à défaut de
          résolution amiable, compétence exclusive est attribuée aux tribunaux du ressort du siège
          social de {legal.companyName}, sous réserve des dispositions d&apos;ordre public.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="12. Contact">
        <LegalParagraph>
          Pour toute question commerciale ou relative à la facturation :{" "}
          <a href={`mailto:${legal.contactEmail}`} className="text-brand-600 underline">
            {legal.contactEmail}
          </a>
          .
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
