"use client";

import Link from "next/link";
import {
  ADDON_CATALOG,
  BASE_SUBSCRIPTION_INCLUDED_USERS,
  BASE_SUBSCRIPTION_PLAN,
  BASE_SUBSCRIPTION_TRIAL_LABEL,
} from "@planwise/shared";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LANDING_HERO_HEADING, LANDING_HERO_SUPPORT, LANDING_TAGLINE } from "@/lib/landing-copy";

const PILLARS = [
  {
    title: "Accessible dès le premier jour",
    description:
      "Indépendant ou petite équipe : démarrez vite grâce aux modèles de dossier et profils prêts à importer — sans consultant ni formation lourde.",
  },
  {
    title: "Dossiers et interventions centralisés",
    description:
      "Suivez chaque dossier, son avancement, ses tâches et son historique depuis un seul endroit.",
  },
  {
    title: "Terrain et preuve d'intervention",
    description:
      "Vos techniciens démarrent, documentent en photos, font signer le client et génèrent le rapport PDF depuis le chantier.",
  },
  {
    title: "Contrats de maintenance suivis",
    description:
      "Planifiez les visites récurrentes : Planwise génère automatiquement les dossiers et interventions à venir.",
  },
  {
    title: "Facturation sans double saisie",
    description:
      "Envoyez un dossier vers votre outil de facturation connecté, puis suivez et validez la facture depuis Planwise.",
  },
] as const;

const FEATURE_SECTIONS = [
  {
    title: "Pilotage opérationnel",
    items: [
      "Tableau de bord orienté action : retards, dossiers en cours, interventions du jour",
      "Tâches à faire pilotées par vos modèles de dossier",
      "Notifications multi-canaux (in-app, push mobile, e-mail) pour rester réactif sur le terrain comme au bureau",
      "Essai avec données de démonstration injectables en un clic",
    ],
  },
  {
    title: "Dossiers & processus",
    items: [
      "Modèles de dossier paramétrables : étapes, tâches et règles de suivi",
      "Catalogue de modèles métiers prêts à importer (plomberie, électricité, chauffage…)",
      "Progression visible et historique des actions sur chaque dossier",
      "Documents chantier joints (photos, PDF) au bon endroit",
    ],
  },
  {
    title: "Interventions terrain",
    items: [
      "« Ma journée » : la liste du jour pour chaque technicien, sur mobile",
      "Démarrage et clôture horodatés, géolocalisés, avec photos",
      "Signature client et rapport PDF générés sur place",
      "Prélèvement de stock directement depuis l’intervention",
    ],
  },
  {
    title: "Contrats de maintenance",
    items: [
      "Contrats liés au client : périodicité, durée et prochaines échéances",
      "Rappel avant échéance et file « à programmer », ou auto-planification à l’échéance",
      "Suivi des contrats actifs sans tableur ni rappel manuel",
    ],
  },
  {
    title: "Reporting & exports",
    items: [
      "Activité par technicien : volume, heures, taux de complétion",
      "Rapport kilométrique : distance, carburant, coût et CO₂",
      "Exports PDF / Excel pour le bureau et la compta",
    ],
  },
  {
    title: "Clients, flotte & stock",
    items: [
      "Clients particuliers et entreprises avec historique lié aux dossiers",
      "Équipes, véhicules et agences alignés sur le planning",
      "Calendrier semaine / mois coloré par équipe",
      "Stock multi-emplacements (entrepôt, agence, véhicule) avec alertes",
    ],
  },
  {
    title: "Facturation & intégrations",
    items: [
      "Devis liés au dossier, prêts à être transformés en facture",
      "Envoi vers votre outil de facturation connecté, sans ressaisie",
      "Suivi et validation des factures synchronisées depuis Planwise",
    ],
  },
  {
    title: "Gouvernance & collaboration",
    items: [
      "Droits fins par rôle : bureau, terrain, lecture seule…",
      "Profils de permissions prêts à importer pour démarrer sans tout paramétrer",
      "Invitation des collaborateurs et isolation par organisation",
      "Préférences de notification par type d’événement et par canal",
    ],
  },
] as const;

const teamSuggestionAddon = ADDON_CATALOG.team_suggestion;
const extraUsersAddon = ADDON_CATALOG.extra_users;

function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold text-sm">
            P
          </span>
          <div>
            <div className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100">
              Planwise
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              {LANDING_TAGLINE}
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600 dark:text-slate-300">
          <a
            href="#fonctionnalites"
            className="hover:text-brand-600 dark:hover:text-brand-400 transition"
          >
            Fonctionnalités
          </a>
          <a href="#tarifs" className="hover:text-brand-600 dark:hover:text-brand-400 transition">
            Tarifs
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden sm:inline-flex rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 transition"
          >
            Essai gratuit
          </Link>
        </div>
      </div>
    </header>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-600/10 via-transparent to-violet-600/5 dark:from-brand-600/20 dark:to-violet-950/30"
            aria-hidden
          />
          <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
            <ScrollReveal when="mount">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-950/40 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300 mb-4">
                <span aria-hidden>✦</span>
                {BASE_SUBSCRIPTION_PLAN.trialDays} jours d&apos;essai gratuit · sans carte bancaire
              </span>
            </ScrollReveal>
            <ScrollReveal when="mount" delayMs={80}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white max-w-3xl">
                {LANDING_HERO_HEADING}
              </h1>
            </ScrollReveal>
            <ScrollReveal when="mount" delayMs={160}>
              <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {LANDING_HERO_SUPPORT} Essayez Planwise pendant {BASE_SUBSCRIPTION_PLAN.trialDays}{" "}
                jours,{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  sans aucun moyen de paiement
                </span>
                .
              </p>
            </ScrollReveal>
            <ScrollReveal when="mount" delayMs={240}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition shadow-sm shadow-brand-600/20"
                >
                  Démarrer mon essai gratuit
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Se connecter
                </Link>
              </div>
            </ScrollReveal>
            <ScrollReveal when="mount" delayMs={320}>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Aucune carte bancaire requise · sans engagement · résiliable à tout moment
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Pillars */}
        <section className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {PILLARS.map((pillar, index) => (
              <ScrollReveal key={pillar.title} delayMs={index * 70}>
                <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20 h-full">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {pillar.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {pillar.description}
                  </p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="fonctionnalites"
          className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40"
        >
          <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
            <ScrollReveal>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Tout ce qu&apos;il faut pour piloter votre activité
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-2xl">
                Pensé pour les indépendants comme pour les TPE : interventions, contrats, flotte,
                stock et facturation — sans surcouche inutile.
              </p>
            </ScrollReveal>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURE_SECTIONS.map((section, index) => (
                <ScrollReveal key={section.title} delayMs={index * 60}>
                  <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-5 h-full">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                      {section.title}
                    </h3>
                    <ul className="space-y-2">
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                        >
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                            aria-hidden
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </article>
                </ScrollReveal>
              ))}

              <ScrollReveal delayMs={FEATURE_SECTIONS.length * 60}>
                <article className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 p-5 md:col-span-2 lg:col-span-1 h-full">
                  <span className="inline-block rounded-full bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 mb-3">
                    Option premium
                  </span>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {teamSuggestionAddon.label}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                    {teamSuggestionAddon.pitch}
                  </p>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {teamSuggestionAddon.priceLabel}
                  </p>
                </article>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="tarifs" className="border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
            <ScrollReveal>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Un prix clair, pensé pour vous
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-2xl">
                Abordable pour un indépendant, scalable pour une TPE. Démarrez par{" "}
                {BASE_SUBSCRIPTION_PLAN.trialDays} jours d&apos;essai gratuit, sans carte bancaire —
                vous ne payez que si vous continuez.
              </p>
            </ScrollReveal>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
              <ScrollReveal delayMs={0}>
                <article className="rounded-2xl border-2 border-brand-600/30 dark:border-brand-500/40 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20 h-full">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {BASE_SUBSCRIPTION_PLAN.name}
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-brand-600 dark:text-brand-400">
                    {BASE_SUBSCRIPTION_PLAN.priceDisplay}
                    <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                      {" "}
                      / {BASE_SUBSCRIPTION_PLAN.periodDisplay}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {BASE_SUBSCRIPTION_TRIAL_LABEL}, {BASE_SUBSCRIPTION_PLAN.commitmentDisplay}
                  </p>
                  <ul className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex gap-2">
                      <span className="text-brand-600" aria-hidden>
                        ✓
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {BASE_SUBSCRIPTION_PLAN.trialDays} jours gratuits sans carte bancaire
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-brand-600" aria-hidden>
                        ✓
                      </span>
                      {BASE_SUBSCRIPTION_INCLUDED_USERS} utilisateurs inclus
                    </li>
                    <li className="flex gap-2">
                      <span className="text-brand-600" aria-hidden>
                        ✓
                      </span>
                      Dossiers, interventions et calendrier
                    </li>
                    <li className="flex gap-2">
                      <span className="text-brand-600" aria-hidden>
                        ✓
                      </span>
                      Contrats de maintenance et planification des visites
                    </li>
                    <li className="flex gap-2">
                      <span className="text-brand-600" aria-hidden>
                        ✓
                      </span>
                      Clients, flotte et stock
                    </li>
                    <li className="flex gap-2">
                      <span className="text-brand-600" aria-hidden>
                        ✓
                      </span>
                      Profils et modèles métiers prêts à importer
                    </li>
                    <li className="flex gap-2">
                      <span className="text-brand-600" aria-hidden>
                        ✓
                      </span>
                      Permissions granulaires · 10 Go de documents
                    </li>
                    <li className="flex gap-2">
                      <span className="text-brand-600" aria-hidden>
                        ✓
                      </span>
                      Données de démo injectables pendant l&apos;essai
                    </li>
                  </ul>
                  <Link
                    href="/register"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition"
                  >
                    Essayer Planwise — {BASE_SUBSCRIPTION_PLAN.trialDays} jours gratuits
                  </Link>
                  <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                    Sans carte bancaire
                  </p>
                </article>
              </ScrollReveal>

              <ScrollReveal delayMs={80}>
                <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20 h-full">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {teamSuggestionAddon.label}
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {teamSuggestionAddon.priceLabel.split(" ")[0]}
                    <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                      {" "}
                      / mois
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    En option sur l&apos;abonnement {BASE_SUBSCRIPTION_PLAN.name}
                  </p>
                  <ul className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex gap-2">
                      <span className="text-emerald-600" aria-hidden>
                        ✓
                      </span>
                      Recommandation de l&apos;équipe la plus proche
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-600" aria-hidden>
                        ✓
                      </span>
                      Distance, temps de trajet et carburant estimés
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-600" aria-hidden>
                        ✓
                      </span>
                      Empreinte CO₂ par intervention
                    </li>
                  </ul>
                  <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                    Activable depuis votre espace abonnement après inscription.
                  </p>
                </article>
              </ScrollReveal>

              <ScrollReveal delayMs={160}>
                <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20 h-full">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {extraUsersAddon.label}
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    2,99 €
                    <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                      {" "}
                      / mois / utilisateur
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    En option sur l&apos;abonnement {BASE_SUBSCRIPTION_PLAN.name} (quantité
                    cumulable)
                  </p>
                  <ul className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex gap-2">
                      <span className="text-brand-600" aria-hidden>
                        ✓
                      </span>
                      Ajoutez autant d&apos;utilisateur que nécessaire
                    </li>
                  </ul>
                  <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                    {extraUsersAddon.pitch}
                  </p>
                </article>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-slate-200 dark:border-slate-800 bg-brand-600 dark:bg-brand-700">
          <ScrollReveal className="max-w-6xl mx-auto px-4 py-14 sm:py-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Prêt à structurer votre activité — sans vous ruiner ?
            </h2>
            <p className="max-w-xl mx-auto text-white/80 mb-8">
              Que vous soyez indépendant ou TPE, créez votre organisation en quelques minutes et
              lancez votre essai de {BASE_SUBSCRIPTION_PLAN.trialDays} jours, sans carte bancaire.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-600 hover:bg-slate-100 transition"
              >
                Démarrer mon essai gratuit
              </Link>
              <Link
                href="/login"
                className="inline-flex rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white font-semibold text-xs">
              P
            </span>
            <span>Planwise — {LANDING_TAGLINE}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition"
            >
              Inscription
            </Link>
            <Link
              href="/accept-invitation"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition"
            >
              Invitation
            </Link>
          </div>
          <div className="w-full border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
            <Link
              href="/mentions-legales"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition"
            >
              Mentions légales
            </Link>
            <Link
              href="/politique-confidentialite"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition"
            >
              Confidentialité
            </Link>
            <Link href="/cgu" className="hover:text-brand-600 dark:hover:text-brand-400 transition">
              CGU
            </Link>
            <Link href="/cgv" className="hover:text-brand-600 dark:hover:text-brand-400 transition">
              CGV
            </Link>
            <Link
              href="/politique-cookies"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition"
            >
              Cookies
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
