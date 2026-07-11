import Link from "next/link";
import { getLegalPublisherConfig } from "@/lib/legal/config";
import { LegalList, LegalParagraph, LegalSection } from "@/components/legal/LegalDocument";

export function PolitiqueCookiesContent() {
  const legal = getLegalPublisherConfig();

  return (
    <>
      <LegalSection title="1. Introduction">
        <LegalParagraph>
          Cette politique explique comment {legal.publisherName} utilise des cookies et autres
          traceurs sur le site <strong>planwise.fr</strong> et l&apos;application{" "}
          <strong>app.planwise.fr</strong>, conformément au RGPD et à la directive ePrivacy.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. Qu'est-ce qu'un cookie ?">
        <LegalParagraph>
          Un cookie est un petit fichier déposé sur votre terminal. Nous utilisons également le{" "}
          <strong>localStorage</strong> du navigateur pour certaines fonctionnalités équivalentes
          (session, préférences).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Cookies strictement nécessaires">
        <LegalParagraph>
          Ces stockages sont indispensables au fonctionnement du service. Ils ne nécessitent pas
          votre consentement :
        </LegalParagraph>
        <LegalList
          items={[
            <>
              <strong>planwise_access_token</strong> — authentification (localStorage).
            </>,
            <>
              <strong>planwise_onboarding_token</strong> — finalisation de l&apos;inscription
              (localStorage).
            </>,
            <>
              <strong>Préférences UI</strong> — thème clair/sombre, état de la barre latérale
              (localStorage).
            </>,
            <>
              <strong>Service worker (PWA)</strong> — mise en cache pour le mode hors ligne.
            </>,
            <>
              <strong>planwise_cookie_consent</strong> — mémorisation de vos choix cookies
              (localStorage).
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Cookies soumis au consentement">
        <LegalParagraph>
          Ces traceurs ne sont déposés qu&apos;après votre accord via le bandeau cookies :
        </LegalParagraph>
        <LegalList
          items={[
            <>
              <strong>Crisp</strong> (client.crisp.chat) — chat support et centre d&apos;aide.
              Finalité : assistance client. Durée : selon Crisp (voir{" "}
              <a
                href="https://crisp.chat/fr/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 underline"
              >
                politique Crisp
              </a>
              ).
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Gérer vos choix">
        <LegalParagraph>
          Lors de votre première visite, un bandeau vous permet d&apos;accepter tous les cookies, de
          refuser les cookies optionnels ou de personnaliser vos préférences.
        </LegalParagraph>
        <LegalParagraph>
          Vous pouvez modifier votre choix à tout moment en supprimant la clé{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
            planwise_cookie_consent
          </code>{" "}
          dans le localStorage de votre navigateur, puis en rechargeant la page — le bandeau
          réapparaîtra.
        </LegalParagraph>
        <LegalParagraph>
          Vous pouvez également configurer votre navigateur pour bloquer les cookies ; certaines
          fonctionnalités (chat support) pourraient alors être indisponibles.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="6. Notifications push">
        <LegalParagraph>
          Les notifications push navigateur ne reposent pas sur des cookies marketing. Elles
          nécessitent une autorisation explicite via la boîte de dialogue du navigateur, activée
          depuis les paramètres de notification de Planwise.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. En savoir plus">
        <LegalParagraph>
          Pour toute question :{" "}
          <a href={`mailto:${legal.dpoEmail}`} className="text-brand-600 underline">
            {legal.dpoEmail}
          </a>
          . Voir aussi la{" "}
          <Link href="/politique-confidentialite" className="text-brand-600 underline">
            Politique de confidentialité
          </Link>
          .
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
