import Link from "next/link";
import {
  ADDON_CATALOG,
  BASE_SUBSCRIPTION_INCLUDED_USERS,
  BASE_SUBSCRIPTION_PLAN,
  BASE_SUBSCRIPTION_TRIAL_LABEL,
} from "@planwise/shared";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BetaBadge } from "@/components/ui/BetaBadge";
import { LANDING_BETA_FREE_NOTE, LANDING_TAGLINE } from "@/lib/landing-copy";

const teamSuggestionAddon = ADDON_CATALOG.team_suggestion;
const extraUsersAddon = ADDON_CATALOG.extra_users;

export const TARIFS_FAQ = [
  {
    question: "Quel est le prix de Planwise ?",
    answer: `L’abonnement Essentiel est à ${BASE_SUBSCRIPTION_PLAN.priceDisplay} HT par mois, ${BASE_SUBSCRIPTION_PLAN.commitmentDisplay}. ${BASE_SUBSCRIPTION_INCLUDED_USERS} utilisateurs sont inclus.`,
  },
  {
    question: "Y a-t-il un essai gratuit ?",
    answer: `Oui : ${BASE_SUBSCRIPTION_PLAN.trialDays} jours d’essai gratuit, sans carte bancaire. Pendant toute la beta, Planwise reste gratuit.`,
  },
  {
    question: "Planwise est-il un CRM pour artisans et TPE du BTP ?",
    answer:
      "Oui. Planwise est un CRM terrain pensé pour indépendants, artisans et TPE : dossiers, planning, interventions, contrats de maintenance, stock et facturation via votre outil comptable.",
  },
  {
    question: "Y a-t-il un engagement ?",
    answer: `Non. L’abonnement Essentiel est ${BASE_SUBSCRIPTION_PLAN.commitmentDisplay} et résiliable à tout moment.`,
  },
] as const;

function TarifsHeader() {
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
          <Link href="/#fonctionnalites" className="hover:text-brand-600 dark:hover:text-brand-400">
            Fonctionnalités
          </Link>
          <span className="font-medium text-brand-600 dark:text-brand-400">Tarifs</span>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/login?open=1"
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

export function TarifsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TarifsHeader />
      <main className="flex-1">
        <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
          <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <BetaBadge />
              <span className="inline-flex items-center rounded-full border border-brand-200 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-950/40 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                {BASE_SUBSCRIPTION_PLAN.trialDays} jours d&apos;essai · sans carte bancaire
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {LANDING_BETA_FREE_NOTE}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Tarifs Planwise : {BASE_SUBSCRIPTION_PLAN.priceDisplay} / mois
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              CRM terrain pour indépendants, artisans et TPE. Abonnement{" "}
              {BASE_SUBSCRIPTION_PLAN.name} à{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                {BASE_SUBSCRIPTION_PLAN.priceDisplay} HT / {BASE_SUBSCRIPTION_PLAN.periodDisplay}
              </strong>
              , {BASE_SUBSCRIPTION_PLAN.commitmentDisplay}, résiliable à tout moment.
            </p>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300 max-w-2xl">
              {BASE_SUBSCRIPTION_TRIAL_LABEL} sans carte bancaire. Pendant toute la beta, Planwise
              reste gratuit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition shadow-sm"
              >
                Démarrer mon essai gratuit
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Voir le produit
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
            Offre et options
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-2xl border-2 border-brand-600/30 dark:border-brand-500/40 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">{BASE_SUBSCRIPTION_PLAN.name}</h3>
              <p className="mt-2 text-3xl font-bold text-brand-600 dark:text-brand-400">
                {BASE_SUBSCRIPTION_PLAN.priceDisplay}
                <span className="text-base font-normal text-slate-500">
                  {" "}
                  / {BASE_SUBSCRIPTION_PLAN.periodDisplay} HT
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {BASE_SUBSCRIPTION_TRIAL_LABEL}, {BASE_SUBSCRIPTION_PLAN.commitmentDisplay}
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>
                  {BASE_SUBSCRIPTION_INCLUDED_USERS} utilisateurs inclus ·{" "}
                  {BASE_SUBSCRIPTION_PLAN.trialDays} jours gratuits sans carte
                </li>
                {BASE_SUBSCRIPTION_PLAN.includedHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition"
              >
                Essayer — {BASE_SUBSCRIPTION_PLAN.trialDays} jours gratuits
              </Link>
            </article>

            <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">{teamSuggestionAddon.label}</h3>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {teamSuggestionAddon.priceLabel}
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {teamSuggestionAddon.pitch}
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">{extraUsersAddon.label}</h3>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {extraUsersAddon.priceLabel}
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Au-delà des {BASE_SUBSCRIPTION_INCLUDED_USERS} utilisateurs inclus dans Essentiel.
              </p>
            </article>
          </div>
        </section>

        <section className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
          <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
              Questions fréquentes sur les tarifs
            </h2>
            <dl className="space-y-6 max-w-3xl">
              {TARIFS_FAQ.map((item) => (
                <div key={item.question}>
                  <dt className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.question}
                  </dt>
                  <dd className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
    </div>
  );
}
