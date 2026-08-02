"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { MaintenanceContractStatus } from "@planwise/shared";
import { MAINTENANCE_SCHEDULING_MODE_LABELS } from "@planwise/shared";
import * as contractsApi from "@/lib/maintenance-contracts.api";
import * as customersApi from "@/lib/customers.api";
import * as casesApi from "@/lib/cases.api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const STATUS_LABELS: Record<MaintenanceContractStatus, string> = {
  draft: "Brouillon",
  active: "Actif",
  suspended: "Suspendu",
  ended: "Terminé",
};

function toLocalInputValue(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduleWindow(nextDueDate: string): { start: string; end: string } {
  const start = new Date(`${nextDueDate}T08:00:00`);
  const end = new Date(`${nextDueDate}T10:00:00`);
  return {
    start: toLocalInputValue(start.toISOString()),
    end: toLocalInputValue(end.toISOString()),
  };
}

export function MaintenanceContractDetailPage({ contractId }: { contractId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");

  const {
    data: contract,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["maintenance-contract", contractId],
    queryFn: () => contractsApi.getMaintenanceContract(contractId),
  });

  const { data: customer } = useQuery({
    queryKey: ["customer", contract?.customerId],
    queryFn: () => customersApi.getCustomer(contract!.customerId),
    enabled: !!contract?.customerId,
  });

  const { data: templates } = useQuery({
    queryKey: ["case-templates"],
    queryFn: () => casesApi.listTemplates(),
    enabled: !!contract?.templateId,
  });

  const templateName = templates?.find((t) => t.id === contract?.templateId)?.name;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isOverdue = !!contract && contract.status === "active" && contract.nextDueDate < today;
  const needsScheduling =
    !!contract &&
    contract.status === "active" &&
    contract.schedulingMode === "schedule_with_client" &&
    (contract.schedulingPending || isOverdue);

  const generateMutation = useMutation({
    mutationFn: () => contractsApi.generateMaintenanceVisit(contractId),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["maintenance-contract", contractId] });
      void queryClient.invalidateQueries({ queryKey: ["maintenance-contracts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showToast("Visite générée (dossier + intervention planifiée).");
      router.push(`/cases/${res.caseId}`);
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Génération impossible", "error");
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: () =>
      contractsApi.scheduleMaintenanceVisit(contractId, {
        scheduledStart: new Date(scheduleStart).toISOString(),
        scheduledEnd: new Date(scheduleEnd).toISOString(),
      }),
    onSuccess: (res) => {
      setScheduleOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["maintenance-contract", contractId] });
      void queryClient.invalidateQueries({ queryKey: ["maintenance-contracts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showToast("Visite programmée.");
      router.push(`/cases/${res.caseId}`);
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Programmation impossible", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => contractsApi.deleteMaintenanceContract(contractId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["maintenance-contracts"] });
      showToast("Contrat supprimé.");
      router.push("/contracts");
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Suppression impossible", "error");
    },
  });

  const openScheduleModal = () => {
    if (!contract) return;
    const window = defaultScheduleWindow(contract.nextDueDate);
    setScheduleStart(window.start);
    setScheduleEnd(window.end);
    setScheduleOpen(true);
  };

  if (isLoading) return <p className="text-sm text-slate-500">Chargement…</p>;
  if (error || !contract) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Contrat introuvable"}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/contracts" className="text-sm text-brand-600 hover:underline">
            ← Contrats
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {contract.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {STATUS_LABELS[contract.status]} · prochaine visite {contract.nextDueDate}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {needsScheduling ? (
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                À programmer
              </span>
            ) : null}
            {isOverdue ? (
              <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200">
                En retard
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission="contracts.update">
            <button
              type="button"
              disabled={scheduleMutation.isPending || contract.status !== "active"}
              onClick={openScheduleModal}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              Programmer la visite
            </button>
          </PermissionGate>
          <PermissionGate permission="contracts.update">
            <button
              type="button"
              disabled={generateMutation.isPending || contract.status !== "active"}
              onClick={() => generateMutation.mutate()}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
            >
              {generateMutation.isPending ? "Génération…" : "Générer maintenant"}
            </button>
          </PermissionGate>
          <PermissionGate permission="contracts.update">
            <Link
              href={`/contracts/${contractId}/edit`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
            >
              Modifier
            </Link>
          </PermissionGate>
          <PermissionGate permission="contracts.delete">
            <button
              type="button"
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
              onClick={async () => {
                const ok = await confirm({
                  title: "Supprimer ce contrat ?",
                  description: "Cette action est définitive.",
                  confirmLabel: "Supprimer",
                  variant: "danger",
                });
                if (ok) deleteMutation.mutate();
              }}
            >
              Supprimer
            </button>
          </PermissionGate>
        </div>
      </div>

      <dl className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Client</dt>
          <dd className="font-medium">
            {customer ? (
              <Link href={`/customers/${customer.id}`} className="text-brand-600 hover:underline">
                {customer.displayName}
              </Link>
            ) : (
              contract.customerId
            )}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Récurrence</dt>
          <dd className="font-medium">Tous les {contract.recurrenceMonths} mois</dd>
        </div>
        <div>
          <dt className="text-slate-500">Mode de planification</dt>
          <dd className="font-medium">
            {MAINTENANCE_SCHEDULING_MODE_LABELS[contract.schedulingMode]}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Rappel</dt>
          <dd className="font-medium">{contract.remindBeforeDays} jours avant l’échéance</dd>
        </div>
        <div>
          <dt className="text-slate-500">Modèle de dossier</dt>
          <dd className="font-medium">
            {contract.templateId ? (
              <Link
                href={`/settings/case-templates/${contract.templateId}`}
                className="text-brand-600 hover:underline"
              >
                {templateName ?? "Voir le modèle"}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Début</dt>
          <dd className="font-medium">{contract.startDate.slice(0, 10)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Fin</dt>
          <dd className="font-medium">{contract.endDate?.slice(0, 10) ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Description</dt>
          <dd className="mt-1 whitespace-pre-wrap">{contract.description || "—"}</dd>
        </div>
      </dl>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/20">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Historique des visites
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {contract.visitHistory.length} visite
            {contract.visitHistory.length > 1 ? "s" : ""}
          </span>
        </div>
        {contract.visitHistory.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucune visite générée pour ce contrat.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {contract.visitHistory.map((visit) => (
              <li
                key={`${visit.caseId}-${visit.generatedAt}`}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/cases/${visit.caseId}`}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Visite du {formatDateOnly(visit.dueDate)}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Générée le {formatDateTime(visit.generatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/cases/${visit.caseId}`}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Voir le dossier
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {scheduleOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-visit-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <h2
              id="schedule-visit-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Programmer la visite
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choisissez le créneau convenu avec le client. Un dossier et une intervention seront
              créés.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Début
                </label>
                <input
                  type="datetime-local"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Fin
                </label>
                <input
                  type="datetime-local"
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setScheduleOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={scheduleMutation.isPending || !scheduleStart || !scheduleEnd}
                onClick={() => scheduleMutation.mutate()}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
              >
                {scheduleMutation.isPending ? "Programmation…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatDateOnly(isoDate: string): string {
  try {
    return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString("fr-FR", {
      dateStyle: "medium",
    });
  } catch {
    return isoDate;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
