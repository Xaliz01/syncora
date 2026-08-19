"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TVA_RATES, type TvaRate } from "@planwise/shared";
import * as api from "@/lib/stock.api";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

const LIST_HREF = "/settings/prestations";

export function PrestationFormPage({ prestationId }: { prestationId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(prestationId);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["prestation", prestationId],
    queryFn: () => api.getPrestation(prestationId!),
    enabled: isEdit,
  });

  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [unit, setUnit] = useState("unité");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultTvaRate, setDefaultTvaRate] = useState<TvaRate>(20);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setReference(existing.reference);
    setUnit(existing.unit);
    setDefaultPrice(String(existing.defaultPrice));
    setDefaultTvaRate(existing.defaultTvaRate);
    setDescription(existing.description ?? "");
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.createPrestation({
        name: name.trim(),
        reference: reference.trim(),
        unit: unit.trim() || "unité",
        defaultPrice: Number(defaultPrice.replace(",", ".")),
        defaultTvaRate,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prestations"] });
      showToast("Prestation créée", "success");
      router.push(LIST_HREF);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Création impossible");
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updatePrestation(prestationId!, {
        name: name.trim(),
        reference: reference.trim(),
        unit: unit.trim() || "unité",
        defaultPrice: Number(defaultPrice.replace(",", ".")),
        defaultTvaRate,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prestations"] });
      void queryClient.invalidateQueries({ queryKey: ["prestation", prestationId] });
      showToast("Prestation mise à jour", "success");
      router.push(LIST_HREF);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Mise à jour impossible");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const price = Number(defaultPrice.replace(",", "."));
    if (!name.trim() || !reference.trim() || !Number.isFinite(price) || price < 0) {
      setError("Nom, référence et tarif HT (≥ 0) sont requis.");
      return;
    }
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <FormPage
      title={isEdit ? "Modifier la prestation" : "Nouvelle prestation"}
      description="Service tarifé réutilisable sur devis et factures (main-d’œuvre, forfaits, déplacements…)."
      breadcrumb={{ href: LIST_HREF, label: "Prestations" }}
      error={error || undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton onClick={() => router.push(LIST_HREF)} disabled={pending} />
          <FormDialogPrimaryButton type="submit" disabled={pending || (isEdit && isLoading)}>
            {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la prestation"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {isEdit && isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : (
        <FormDialogSection title="Prestation">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={formFieldLabelClassName}>
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={formFieldInputClassName}
              />
            </div>
            <div>
              <label className={formFieldLabelClassName}>
                Référence <span className="text-red-500">*</span>
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                className={formFieldInputClassName}
              />
            </div>
            <div>
              <label className={formFieldLabelClassName}>
                Tarif HT (€) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                required
                className={formFieldInputClassName}
              />
            </div>
            <div>
              <label className={formFieldLabelClassName}>TVA</label>
              <select
                value={defaultTvaRate}
                onChange={(e) => setDefaultTvaRate(Number(e.target.value) as TvaRate)}
                className={formFieldInputClassName}
              >
                {TVA_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r} %
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={formFieldLabelClassName}>Unité</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={formFieldInputClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={formFieldLabelClassName}>Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={formFieldInputClassName}
              />
            </div>
          </div>
        </FormDialogSection>
      )}
    </FormPage>
  );
}
