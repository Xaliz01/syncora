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
            "Facturation de l'abonnement Planwise : identifiants Stripe, historique d'abonnement (via Stripe).",
            "Intégrations de facturation (optionnelles, activées par le Client) : jetons d'accès OAuth ou clés API (stockés chiffrés), identifiants techniques de connexion (ex. nom / identifiant d'entreprise côté outil), métadonnées de synchronisation des factures créées depuis Planwise (statut distant, numéro, lien, montants associés).",
            "Usage : journaux techniques, préférences (thème, sidebar), notifications.",
            "Mesure d'audience first-party : pages vues (chemin, surface landing/app, referrer hôte, pays/région approximatifs dérivés de l'IP sans conservation de l'IP, identifiants aléatoires navigateur), sans publicité ni revente.",
            "Support : échanges via Crisp (si consentement cookies).",
            "Données saisies par le Client : clients, interventions, géolocalisation optionnelle, photos, signatures, devis et éléments nécessaires à la facturation.",
          ]}
        />
        <LegalParagraph>
          Planwise ne réalise pas d&apos;import massif du grand livre ou de l&apos;historique
          comptable de l&apos;outil tiers. Les données échangées avec Pennylane ou Qonto portent
          principalement sur les clients et factures que le Client choisit de créer ou de suivre
          depuis Planwise, ainsi que sur le statut de ces factures.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Finalités et bases légales">
        <LegalList
          items={[
            <>
              <strong>Fourniture du service</strong> — exécution du contrat (art. 6.1.b RGPD).
            </>,
            <>
              <strong>Facturation et comptabilité de l&apos;abonnement</strong> — obligation légale
              et contrat (art. 6.1.b et 6.1.c).
            </>,
            <>
              <strong>Intégrations de facturation</strong> — exécution du contrat lorsque le Client
              active volontairement une connexion (Pennylane, Qonto, etc.) afin d&apos;émettre ou de
              suivre des factures sans double saisie (art. 6.1.b).
            </>,
            <>
              <strong>Support et sécurité</strong> — intérêt légitime (art. 6.1.f), sauf Crisp
              soumis au consentement. Cela inclut, le cas échéant, un accès support encadré au
              compte d&apos;un utilisateur (impersonation) : motif documenté, durée limitée, journal
              d&apos;audit, personnel autorisé uniquement.
            </>,
            <>
              <strong>Amélioration du produit</strong> — intérêt légitime, données agrégées ou
              anonymisées lorsque possible, y compris la mesure d&apos;audience first-party (pages
              vues, pays/région approximatifs dérivés de l&apos;IP sans conservation de l&apos;IP)
              pour comprendre l&apos;usage du site et de l&apos;application (art. 6.1.f). Opposition
              possible via{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                planwise_analytics_opt_out=1
              </code>{" "}
              dans le localStorage.
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
            "Stripe — paiements et facturation de l'abonnement Planwise (États-Unis, clauses contractuelles types).",
            "OVHcloud — hébergement applicatif et stockage (France, datacenter de Gravelines).",
            "Crisp — support client (consentement requis).",
            "Prestataire email (SMTP) — notifications transactionnelles.",
            "API publiques françaises (recherche-entreprises.api.gouv.fr, api-adresse.data.gouv.fr) — préremplissage SIRET/adresse.",
          ]}
        />
        <LegalParagraph>
          Lorsque le Client active une intégration de facturation (notamment{" "}
          <strong>Pennylane</strong> ou <strong>Qonto</strong>), des données nécessaires à
          l&apos;émission et au suivi des factures (identité / coordonnées clients, lignes de devis,
          montants, TVA, statut de facture) peuvent être transmises à cet outil,{" "}
          <strong>sur instruction du Client</strong>. Ces éditeurs sont des prestataires choisis et
          contractés par le Client ; leurs traitements sont régis par leurs propres conditions et
          politiques de confidentialité. {legal.companyName} n&apos;est pas responsable des
          traitements réalisés par ces outils au-delà de la transmission technique opérée pour le
          compte du Client.
        </LegalParagraph>
        <LegalParagraph>
          Le Client demeure responsable de traitement pour les données de ses propres clients finaux
          saisies dans Planwise ou synchronisées via une intégration. {legal.companyName} agit alors
          en sous-traitant (art. 28 RGPD).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Durées de conservation">
        <LegalList
          items={[
            "Compte actif : durée de la relation contractuelle.",
            "Compte fermé : suppression ou anonymisation sous 3 ans sauf obligation légale contraire.",
            "Factures de l'abonnement Planwise : 10 ans (obligations comptables).",
            "Connexion d'intégration : jusqu'à déconnexion par le Client ou suppression du compte ; les jetons d'accès sont alors supprimés.",
            "Métadonnées de synchronisation de factures : durée de la relation contractuelle ou jusqu'à détachement / suppression demandée par l'organisation.",
            "Journaux techniques : jusqu'à 12 mois.",
            "Mesure d'audience first-party (pages vues, pays/région approximatifs — sans IP stockée) : environ 400 jours.",
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
