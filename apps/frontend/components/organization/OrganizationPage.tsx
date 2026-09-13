"use client";

import Link from "next/link";
import {
  INVOICE_MENTION_KEYS,
  INVOICE_MENTION_LABELS_FR,
  resolveInvoiceMentions,
} from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { useOrganization } from "@/lib/organization";
import { hasPermission } from "@/lib/auth-permissions";
import { OrganizationLogoSection } from "@/components/organization/OrganizationLogoSection";

function formatValue(value: string | undefined | null) {
  const v = value?.trim();
  return v && v.length > 0 ? v : "—";
}

export function OrganizationPage() {
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();
  const canUpdateOrganization = hasPermission(user, "organizations.update");

  const displayName = activeOrganization?.name?.trim() || "Organisation";
  const mentions = resolveInvoiceMentions(activeOrganization?.invoiceMentions);

  return (
    <div className="space-y-8 w-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {displayName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Coordonnées et identité de votre espace Planwise.
          </p>
        </div>
        {canUpdateOrganization && (
          <Link
            href="/organization/edit"
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Modifier
          </Link>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Coordonnées de l’organisation
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              ID technique
            </p>
            <code className="text-xs text-slate-700 dark:text-slate-200 break-all">
              {user?.organizationId ?? "—"}
            </code>
          </div>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Nom</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
              {formatValue(activeOrganization?.name)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">SIRET</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100 font-mono">
              {formatValue(activeOrganization?.siret)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">E-mail de facturation</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {formatValue(activeOrganization?.email)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Téléphone</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {formatValue(activeOrganization?.phone)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500 dark:text-slate-400">Adresse</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {[activeOrganization?.addressLine1, activeOrganization?.addressLine2]
                .filter(Boolean)
                .join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Code postal</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {formatValue(activeOrganization?.postalCode)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Ville</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {formatValue(activeOrganization?.city)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Pays</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {formatValue(activeOrganization?.country)}
            </dd>
          </div>
          <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400">Créée le</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
              {activeOrganization?.createdAt
                ? new Date(activeOrganization.createdAt).toLocaleDateString("fr-FR")
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Facturation et mentions légales
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Ces mentions apparaissent sur les prochaines factures. Les factures déjà émises conservent
          le texte de l’époque.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Forme juridique</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {formatValue(activeOrganization?.legalForm)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Capital social</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {formatValue(activeOrganization?.shareCapital)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">RCS</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {formatValue(activeOrganization?.rcsLabel)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">N° TVA</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {formatValue(activeOrganization?.vatNumber)}
            </dd>
          </div>
          {INVOICE_MENTION_KEYS.filter(
            (key) => key !== "vatFranchise" || mentions.vatFranchise,
          ).map((key) => (
            <div key={key} className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">
                {INVOICE_MENTION_LABELS_FR[key]}
              </dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-100">{mentions[key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <OrganizationLogoSection />
    </div>
  );
}
