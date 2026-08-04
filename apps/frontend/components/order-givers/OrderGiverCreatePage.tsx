"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrderGiverCreateForm } from "./OrderGiverCreateForm";

export function OrderGiverCreatePage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/order-givers"
          className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500"
        >
          &larr; Donneurs d&apos;ordre
        </Link>
        <h1 className="mt-3 text-xl font-semibold sm:text-2xl">Nouveau donneur d&apos;ordre</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ajoutez un tiers à facturer, distinct du client, pour le lier ensuite à vos dossiers.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20 sm:p-6">
        <OrderGiverCreateForm
          submitLabel="Créer le donneur d'ordre"
          onCancel={() => router.push("/order-givers")}
          onSuccess={(og) => router.push(`/order-givers/${og.id}`)}
        />
      </div>
    </div>
  );
}
