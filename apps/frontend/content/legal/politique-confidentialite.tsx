import Link from "next/link";
import { getLegalContractPartyName, getLegalPublisherConfig } from "@/lib/legal/config";
import { LegalList, LegalParagraph, LegalSection } from "@/components/legal/LegalDocument";

export function PolitiqueConfidentialiteContent() {
  const legal = getLegalPublisherConfig();

  return (
    <>
      <LegalSection title="1. Responsable de traitement">
        <LegalParagraph>
          {getLegalContractPartyName(legal)} ({legal.address}) est responsable du traitement des
          données personnelles relatives aux comptes utilisateurs, à la facturation et au support.
        </LegalParagraph>
        <LegalParagraph>
          Contact données personnelles / DPO :{" "}
          <a href={`mailto:${legal.dpoEmail}`} className="text-brand-600 underline">
            {legal.dpoEmail}
          </a>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <LegalParagraph>Nous traitons notamment :</LegalParagraph>
        <LegalList
          items={[
            "Identité et contact : nom, email, mot de passe (stocké de manière sécurisée), rôle.",
            "Organisation : raison sociale, SIRET, adresse postale.",
            "Facturation : identifiants Stripe, historique d'abonnement (via Stripe).",
            "Usage : journaux techniques, préférences (thème, sidebar), notifications.",
            "Support : échanges via Crisp (si consentement cookies).",
            "Données saisies par le Client : clients, interventions, géolocalisation optionnelle, photos, signatures.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Finalités et bases légales">
        <LegalList
          items={[
            <>
              <strong>Fourniture du service</strong> — exécution du contrat (art. 6.1.b RGPD).
            </>,
            <>
              <strong>Facturation et comptabilité</strong> — obligation légale et contrat (art.
              6.1.b et 6.1.c).
            </>,
            <>
              <strong>Support et sécurité</strong> — intérêt légitime (art. 6.1.f), sauf Crisp
              soumis au consentement. Cela inclut, le cas échéant, un accès support encadré au
              compte d&apos;un utilisateur (impersonation) : motif documenté, durée limitée, journal
              d&apos;audit, personnel autorisé uniquement.
            </>,
            <>
              <strong>Amélioration du produit</strong> — intérêt légitime, données agrégées ou
              anonymisées lorsque possible.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Destinataires et sous-traitants">
        <LegalParagraph>
          Les données peuvent être communiquées à des prestataires agissant pour notre compte :
        </LegalParagraph>
        <LegalList
          items={[
            "Stripe — paiements et facturation (États-Unis, clauses contractuelles types).",
            "OVHcloud — hébergement applicatif et stockage (France, datacenter de Gravelines).",
            "Crisp — support client (consentement requis).",
            "Prestataire email (SMTP) — notifications transactionnelles.",
            "API publiques françaises (recherche-entreprises.api.gouv.fr, api-adresse.data.gouv.fr) — préremplissage SIRET/adresse.",
          ]}
        />
        <LegalParagraph>
          Le Client demeure responsable de traitement pour les données de ses propres clients finaux
          saisies dans Planwise. {legal.companyName} agit alors en sous-traitant (art. 28 RGPD).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Durées de conservation">
        <LegalList
          items={[
            "Compte actif : durée de la relation contractuelle.",
            "Compte fermé : suppression ou anonymisation sous 3 ans sauf obligation légale contraire.",
            "Factures : 10 ans (obligations comptables).",
            "Journaux techniques : jusqu'à 12 mois.",
            "Données saisies par le Client : selon paramétrage ou demande de suppression de l'organisation.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Vos droits">
        <LegalParagraph>
          Conformément au RGPD, vous disposez des droits d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de portabilité, lorsque applicable.
        </LegalParagraph>
        <LegalParagraph>
          Pour exercer vos droits :{" "}
          <a href={`mailto:${legal.dpoEmail}`} className="text-brand-600 underline">
            {legal.dpoEmail}
          </a>
          . Une réponse vous sera adressée sous un mois. Vous pouvez introduire une réclamation
          auprès de la CNIL (
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline"
          >
            www.cnil.fr
          </a>
          ).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. Transferts hors UE">
        <LegalParagraph>
          Lorsque des sous-traitants sont situés hors Union européenne (ex. Stripe), des garanties
          appropriées sont mises en place (clauses contractuelles types de la Commission
          européenne).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="8. Sécurité">
        <LegalParagraph>
          Nous mettons en œuvre des mesures techniques et organisationnelles adaptées : chiffrement
          des communications (HTTPS), authentification, isolation multi-tenant par organisation,
          contrôle d&apos;accès, sauvegardes.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="9. Cookies">
        <LegalParagraph>
          Voir la{" "}
          <Link href="/politique-cookies" className="text-brand-600 underline">
            Politique cookies
          </Link>{" "}
          pour le détail des traceurs et la gestion de votre consentement.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="10. Mises à jour">
        <LegalParagraph>
          Cette politique peut être mise à jour. La date de dernière révision figure en tête de
          page. En cas de changement majeur, les utilisateurs en seront informés.
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
