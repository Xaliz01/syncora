"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerCreateForm } from "./CustomerCreateForm";

export function CustomerCreatePage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/customers"
          className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500"
        >
          &larr; Clients
        </Link>
        <h1 className="mt-3 text-xl font-semibold sm:text-2xl">Nouveau client</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ajoutez une personne physique ou morale pour la lier ensuite à vos dossiers.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20 sm:p-6">
        <CustomerCreateForm
          submitLabel="Créer le client"
          onCancel={() => router.push("/customers")}
          onSuccess={(c) => router.push(`/customers/${c.id}`)}
        />
      </div>
    </div>
  );
}
