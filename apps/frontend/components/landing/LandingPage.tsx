"use client";

import Link from "next/link";
import {
  ADDON_CATALOG,
  BASE_SUBSCRIPTION_INCLUDED_USERS,
  BASE_SUBSCRIPTION_PLAN,
  BASE_SUBSCRIPTION_TRIAL_LABEL,
} from "@syncora/shared";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const PILLARS = [
  {
    title: "Dossiers et interventions centralisés",
    description:
      "Suivez chaque dossier, son avancement, ses tâches et son historique depuis un seul endroit.",
  },
  {
    title: "Planning terrain fluide",
    description:
      "Planifiez, glissez-déposez et réorganisez les interventions en quelques secondes.",
  },
  {
    title: "Flotte et équipes alignées",
    description:
      "Pilotez équipes, techniciens, agences et véhicules avec une vue opérationnelle cohérente.",
  },
  {
    title: "Clients et accès maîtrisés",
    description:
      "Retrouvez vos clients rapidement et sécurisez l'accès via des permissions adaptées.",
  },
] as const;

const FEATURE_SECTIONS = [
  {
    title: "Pilotage opérationnel",
    items: [
      "Tableau de bord : dossiers assignés, en cours, terminés, en retard",
      "Widgets de tâches à faire par modèle de dossier",
      "Prochaines interventions et accès rapide au calendrier",
      "Recherche globale (dossiers, interventions, flotte, stock, utilisateurs)",
      "Centre de notifications avec liens directs vers les ressources",
    ],
  },
  {
    title: "Dossiers & processus",
    items: [
      "Statuts, priorités, échéances et progression par étapes",
      "Modèles de dossier paramétrables (étapes, tâches, règles tableau de bord)",
      "Assignation à des utilisateurs et timeline d'avancement",
      "Historique complet des actions sur chaque dossier",
      "Documents joints avec prévisualisation (images, PDF)",
    ],
  },
  {
    title: "Interventions & planning",
    items: [
      "Interventions liées aux dossiers avec statuts et équipes",
      "Calendrier semaine / mois avec code couleur par équipe",
      "Glisser-déposer pour planifier les interventions non planifiées",
      "Consommation d'articles de stock sur chaque intervention",
    ],
  },
  {
    title: "Clients, flotte & stock",
    items: [
      "Fiches clients personnes physiques et morales",
      "Équipes, techniciens, véhicules et agences opérationnelles",
      "Catalogue articles, alertes stock bas et mouvements (entrées, sorties, ajustements)",
    ],
  },
  {
    title: "Gouvernance & collaboration",
    items: [
      "Espaces organisation isolés (multi-tenant)",
      "Profils et permissions granulaires par domaine métier",
      "Invitations d'utilisateurs et gestion des rôles",
      "Préférences utilisateur (thème clair / sombre, menu latéral)",
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
            S
          </span>
          <div>
            <div className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100">
              Syncora
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              CRM des opérations terrain
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
            Démarrer
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
            <p className="text-sm font-medium text-brand-600 dark:text-brand-400 mb-3">
              CRM des opérations terrain
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white max-w-3xl">
              Pilotez vos opérations terrain depuis un seul outil
            </h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Centralisez dossiers, interventions, clients, flotte et stocks. Standardisez vos
              processus, planifiez vos équipes et gardez une vision claire de votre activité.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition shadow-sm shadow-brand-600/20"
              >
                Créer mon organisation
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20"
              >
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {pillar.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="fonctionnalites"
          className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40"
        >
          <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Tout ce dont vous avez besoin sur le terrain
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-2xl">
              Des fonctionnalités pensées pour les équipes qui gèrent des interventions, une flotte
              et des stocks au quotidien.
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURE_SECTIONS.map((section) => (
                <article
                  key={section.title}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-5"
                >
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
              ))}

              {/* Addon highlight card */}
              <article className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 p-5 md:col-span-2 lg:col-span-1">
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
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="tarifs" className="border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Une offre simple, sans engagement
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-2xl">
              Commencez avec l&apos;abonnement socle, puis ajoutez les options dont vous avez
              besoin.
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
              <article className="rounded-2xl border-2 border-brand-600/30 dark:border-brand-500/40 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20">
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
                    Dossiers, interventions et calendrier
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
                    {BASE_SUBSCRIPTION_INCLUDED_USERS} utilisateurs inclus
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-600" aria-hidden>
                      ✓
                    </span>
                    Permissions et multi-organisation
                  </li>
                </ul>
                <Link
                  href="/register"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition"
                >
                  Essayer Syncora — {BASE_SUBSCRIPTION_PLAN.trialDays} jours gratuits
                </Link>
              </article>

              <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20">
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
                  En option sur l&apos;abonnement {BASE_SUBSCRIPTION_PLAN.name} (quantité cumulable)
                </p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex gap-2">
                    <span className="text-brand-600" aria-hidden>
                      ✓
                    </span>
                    {BASE_SUBSCRIPTION_INCLUDED_USERS} utilisateurs inclus dans le socle
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-600" aria-hidden>
                      ✓
                    </span>
                    Ajoutez autant de places que nécessaire
                  </li>
                </ul>
                <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                  {extraUsersAddon.pitch}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20">
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
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-slate-200 dark:border-slate-800 bg-brand-600 dark:bg-brand-700">
          <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Prêt à structurer vos opérations terrain ?
            </h2>
            <p className="text-brand-100 max-w-xl mx-auto mb-8">
              Créez votre organisation en quelques minutes et centralisez votre activité dès
              aujourd&apos;hui.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition"
              >
                Créer mon organisation
              </Link>
              <Link
                href="/login"
                className="inline-flex rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white font-semibold text-xs">
              S
            </span>
            <span>Syncora — CRM des opérations terrain</span>
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
        </div>
      </footer>
    </div>
  );
}
