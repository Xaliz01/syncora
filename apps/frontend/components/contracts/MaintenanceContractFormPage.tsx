"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
  MaintenanceContractStatus,
  MaintenanceRemindBeforeDays,
  MaintenanceSchedulingMode,
} from "@planwise/shared";
import {
  DEFAULT_MAINTENANCE_REMIND_BEFORE_DAYS,
  DEFAULT_MAINTENANCE_SCHEDULING_MODE,
  MAINTENANCE_REMIND_BEFORE_DAYS,
  MAINTENANCE_SCHEDULING_MODE_LABELS,
} from "@planwise/shared";
import * as contractsApi from "@/lib/maintenance-contracts.api";
import * as customersApi from "@/lib/customers.api";
import * as casesApi from "@/lib/cases.api";
import { CaseCustomerPicker } from "@/components/cases/CaseCustomerPicker";
import { CaseInterventionSitePicker } from "@/components/cases/CaseInterventionSitePicker";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

const STATUS_OPTIONS: { value: MaintenanceContractStatus; label: string }[] = [
  { value: "draft", label: "Brouillon" },
  { value: "active", label: "Actif" },
  { value: "suspended", label: "Suspendu" },
  { value: "ended", label: "Terminé" },
];

type FormState = {
  customerId: string;
  siteId: string;
  templateId: string;
  title: string;
  description: string;
  status: MaintenanceContractStatus;
  startDate: string;
  endDate: string;
  recurrenceMonths: string;
  nextDueDate: string;
  schedulingMode: MaintenanceSchedulingMode;
  remindBeforeDays: MaintenanceRemindBeforeDays;
  notes: string;
};

const emptyForm = (): FormState => ({
  customerId: "",
  siteId: "",
  templateId: "",
  title: "",
  description: "",
  status: "draft",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  recurrenceMonths: "12",
  nextDueDate: "",
  schedulingMode: DEFAULT_MAINTENANCE_SCHEDULING_MODE,
  remindBeforeDays: DEFAULT_MAINTENANCE_REMIND_BEFORE_DAYS,
  notes: "",
});

export function MaintenanceContractFormPage({
  mode,
  contractId,
  initialCustomerId,
}: {
  mode: "create" | "edit";
  contractId?: string;
  initialCustomerId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(() => ({
    ...emptyForm(),
    customerId: initialCustomerId ?? "",
  }));
  const [error, setError] = useState<string | null>(null);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["maintenance-contract", contractId],
    queryFn: () => contractsApi.getMaintenanceContract(contractId!),
    enabled: mode === "edit" && !!contractId,
  });

  const [hydratedContractId, setHydratedContractId] = useState<string | null>(null);

  useEffect(() => {
    if (!existing || hydratedContractId === existing.id) return;
    setForm({
      customerId: existing.customerId,
      siteId: existing.siteId ?? "",
      templateId: existing.templateId ?? "",
      title: existing.title,
      description: existing.description ?? "",
      status: existing.status,
      startDate: existing.startDate.slice(0, 10),
      endDate: existing.endDate?.slice(0, 10) ?? "",
      recurrenceMonths: String(existing.recurrenceMonths),
      nextDueDate: existing.nextDueDate.slice(0, 10),
      schedulingMode: existing.schedulingMode,
      remindBeforeDays: existing.remindBeforeDays,
      notes: existing.notes ?? "",
    });
    setHydratedContractId(existing.id);
  }, [existing, hydratedContractId]);

  const { data: templates } = useQuery({
    queryKey: ["case-templates"],
    queryFn: () => casesApi.listTemplates(),
  });

  const { data: customerDetail } = useQuery({
    queryKey: ["customer", form.customerId],
    queryFn: () => customersApi.getCustomer(form.customerId),
    enabled: !!form.customerId,
  });

  const sites = customerDetail?.sites ?? [];

  const handleCustomerChange = (customerId: string) => {
    setForm((f) => ({ ...f, customerId, siteId: "" }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.customerId.trim()) {
        throw new Error("Sélectionnez un client.");
      }
      const recurrenceMonths = Number(form.recurrenceMonths);
      const payload = {
        customerId: form.customerId,
        siteId: form.siteId || undefined,
        templateId: form.templateId || undefined,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        recurrenceMonths,
        nextDueDate: form.nextDueDate || undefined,
        schedulingMode: form.schedulingMode,
        remindBeforeDays: form.remindBeforeDays,
        notes: form.notes.trim() || undefined,
      };
      if (mode === "create") {
        return contractsApi.createMaintenanceContract(payload);
      }
      return contractsApi.updateMaintenanceContract(contractId!, {
        ...payload,
        siteId: form.siteId || null,
        templateId: form.templateId || null,
        endDate: form.endDate || null,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["maintenance-contracts"] });
      void queryClient.invalidateQueries({ queryKey: ["maintenance-contract", res.id] });
      showToast(mode === "create" ? "Contrat créé." : "Contrat mis à jour.");
      router.push(`/contracts/${res.id}`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    },
  });

  if (mode === "edit" && loadingExisting) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>;
  }

  return (
    <FormPage
      title={mode === "create" ? "Nouveau contrat de maintenance" : "Modifier le contrat"}
      description="Définissez la périodicité, le mode de planification et le client pour les prochaines visites."
      breadcrumb={
        mode === "edit" && contractId
          ? { href: `/contracts/${contractId}`, label: form.title.trim() || "Fiche contrat" }
          : { href: "/contracts", label: "Contrats" }
      }
      error={error || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        saveMutation.mutate();
      }}
      footer={
        <>
          <FormDialogCancelButton
            onClick={() =>
              router.push(mode === "edit" && contractId ? `/contracts/${contractId}` : "/contracts")
            }
            disabled={saveMutation.isPending}
          />
          <PermissionGate permission={mode === "create" ? "contracts.create" : "contracts.update"}>
            <FormDialogPrimaryButton type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </FormDialogPrimaryButton>
          </PermissionGate>
        </>
      }
    >
      <FormDialogSection title="Contrat et client">
        <div>
          <label className={formFieldLabelClassName}>Titre</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={formFieldInputClassName}
            placeholder="Entretien chaudière annuel"
          />
        </div>

        <CaseCustomerPicker
          idPrefix="contract-customer"
          value={form.customerId}
          initialDisplayName={customerDetail?.displayName}
          onChange={handleCustomerChange}
          disabled={saveMutation.isPending}
        />

        {form.customerId && sites.length > 0 ? (
          <CaseInterventionSitePicker
            sites={sites}
            value={form.siteId}
            onChange={(siteId) => setForm((f) => ({ ...f, siteId }))}
            disabled={saveMutation.isPending}
          />
        ) : null}

        <div>
          <label className={formFieldLabelClassName}>Modèle de dossier (optionnel)</label>
          <p className={formFieldHintClassName}>
            Appliqué automatiquement à chaque visite générée (étapes et tâches).
          </p>
          <select
            value={form.templateId}
            onChange={(e) => setForm((f) => ({ ...f, templateId: e.target.value }))}
            disabled={saveMutation.isPending}
            className={formFieldInputClassName}
          >
            <option value="">Sans modèle (dossier vierge)</option>
            {(templates ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.steps.length > 0 ? ` (${t.steps.length} étapes)` : ""}
              </option>
            ))}
          </select>
        </div>
      </FormDialogSection>

      <FormDialogSection title="Périodicité et planification">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={formFieldLabelClassName}>Statut</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as MaintenanceContractStatus }))
              }
              className={formFieldInputClassName}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formFieldLabelClassName}>Récurrence (mois)</label>
            <input
              required
              type="number"
              min={1}
              value={form.recurrenceMonths}
              onChange={(e) => setForm((f) => ({ ...f, recurrenceMonths: e.target.value }))}
              className={formFieldInputClassName}
            />
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className={formFieldLabelClassName}>Planification des visites</legend>
          <div className="space-y-2">
            {(Object.keys(MAINTENANCE_SCHEDULING_MODE_LABELS) as MaintenanceSchedulingMode[]).map(
              (modeValue) => (
                <label
                  key={modeValue}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <input
                    type="radio"
                    name="schedulingMode"
                    className="mt-1"
                    checked={form.schedulingMode === modeValue}
                    onChange={() => setForm((f) => ({ ...f, schedulingMode: modeValue }))}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                      {MAINTENANCE_SCHEDULING_MODE_LABELS[modeValue]}
                    </span>
                    <span className={formFieldHintClassName}>
                      {modeValue === "schedule_with_client"
                        ? "Rappel avant l’échéance ; vous programmez le créneau avec le client."
                        : "À l’échéance, un dossier et une intervention sont créés automatiquement."}
                    </span>
                  </span>
                </label>
              ),
            )}
          </div>
          <div>
            <label className={formFieldLabelClassName}>Rappel avant échéance</label>
            <select
              value={form.remindBeforeDays}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  remindBeforeDays: Number(e.target.value) as MaintenanceRemindBeforeDays,
                }))
              }
              className={formFieldInputClassName}
            >
              {MAINTENANCE_REMIND_BEFORE_DAYS.map((days) => (
                <option key={days} value={days}>
                  {days} jours avant
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      </FormDialogSection>

      <FormDialogSection title="Dates et informations complémentaires">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={formFieldLabelClassName}>Début</label>
            <input
              required
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className={formFieldInputClassName}
            />
          </div>
          <div>
            <label className={formFieldLabelClassName}>Fin (optionnel)</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className={formFieldInputClassName}
            />
          </div>
          <div>
            <label className={formFieldLabelClassName}>Prochaine visite</label>
            <input
              type="date"
              value={form.nextDueDate}
              onChange={(e) => setForm((f) => ({ ...f, nextDueDate: e.target.value }))}
              className={formFieldInputClassName}
            />
            <p className={formFieldHintClassName}>Si vide, la date de début est utilisée.</p>
          </div>
        </div>

        <div>
          <label className={formFieldLabelClassName}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className={formFieldInputClassName}
          />
        </div>

        <div>
          <label className={formFieldLabelClassName}>Notes internes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className={formFieldInputClassName}
          />
        </div>
      </FormDialogSection>
    </FormPage>
  );
}
