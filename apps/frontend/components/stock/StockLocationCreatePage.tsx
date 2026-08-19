"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StockLocationType } from "@planwise/shared";
import * as stockApi from "@/lib/stock.api";
import * as fleetApi from "@/lib/fleet.api";
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

const LIST_HREF = "/settings/stock/locations";

export function StockLocationFormPage({ locationId }: { locationId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(locationId);
  const detailHref = locationId ? `${LIST_HREF}/${locationId}` : LIST_HREF;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["stock-location", locationId],
    queryFn: () => stockApi.getStockLocation(locationId!),
    enabled: isEdit,
  });

  const [name, setName] = useState("");
  const [type, setType] = useState<StockLocationType>("warehouse");
  const [referenceId, setReferenceId] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const { data: agences } = useQuery({
    queryKey: ["agences"],
    queryFn: () => fleetApi.listAgences(),
    enabled: !isEdit && type === "agence",
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => fleetApi.listVehicles(),
    enabled: !isEdit && type === "vehicle",
  });

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setType(existing.type);
    setReferenceId(existing.referenceId ?? "");
    setAddress(existing.address ?? "");
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: (payload: stockApi.CreateStockLocationPayload) =>
      stockApi.createStockLocation(payload),
    onSuccess: (location) => {
      void queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      showToast("Emplacement créé avec succès.");
      router.push(`${LIST_HREF}/${location.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: stockApi.UpdateStockLocationPayload) =>
      stockApi.updateStockLocation(locationId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stock-location", locationId] });
      void queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      showToast("Emplacement mis à jour.");
      router.push(detailHref);
    },
    onError: (err: Error) => setError(err.message),
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    if (isEdit) {
      updateMutation.mutate({
        name: name.trim(),
        address: address.trim() || undefined,
      });
      return;
    }
    if ((type === "agence" || type === "vehicle") && !referenceId) {
      setError(type === "agence" ? "Sélectionnez une agence" : "Sélectionnez un véhicule");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      type,
      referenceId: referenceId || undefined,
      address: address.trim() || undefined,
    });
  };

  return (
    <FormPage
      title={isEdit ? "Modifier l'emplacement" : "Nouvel emplacement"}
      description={
        isEdit
          ? "Mettez à jour le nom et l’adresse de l’emplacement."
          : "Créez un entrepôt, une agence ou un véhicule pour suivre le stock par lieu."
      }
      breadcrumb={{
        href: isEdit ? detailHref : LIST_HREF,
        label: isEdit
          ? name.trim() || existing?.name || "Fiche emplacement"
          : "Emplacements de stock",
      }}
      error={error || undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton
            onClick={() => router.push(isEdit ? detailHref : LIST_HREF)}
            disabled={pending}
          />
          <FormDialogPrimaryButton type="submit" disabled={pending || (isEdit && isLoading)}>
            {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer l'emplacement"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {isEdit && isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : (
        <FormDialogSection title="Emplacement">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={formFieldLabelClassName}>
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Entrepôt principal"
                required
                className={formFieldInputClassName}
              />
            </div>
            {!isEdit ? (
              <div>
                <label className={formFieldLabelClassName}>
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as StockLocationType);
                    setReferenceId("");
                  }}
                  className={formFieldInputClassName}
                >
                  <option value="warehouse">Entrepôt</option>
                  <option value="agence">Agence</option>
                  <option value="vehicle">Véhicule</option>
                </select>
              </div>
            ) : (
              <div>
                <label className={formFieldLabelClassName}>Type</label>
                <input
                  value={
                    type === "warehouse" ? "Entrepôt" : type === "agence" ? "Agence" : "Véhicule"
                  }
                  disabled
                  className={formFieldInputClassName}
                />
                <p className={formFieldHintClassName}>Le type ne peut pas être modifié.</p>
              </div>
            )}
            {!isEdit && type === "agence" ? (
              <div>
                <label className={formFieldLabelClassName}>
                  Agence liée <span className="text-red-500">*</span>
                </label>
                <select
                  value={referenceId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setReferenceId(id);
                    const agence = (agences ?? []).find((a) => a.id === id);
                    if (agence) {
                      const parts = [
                        agence.address,
                        [agence.postalCode, agence.city].filter(Boolean).join(" "),
                      ].filter((p) => p && String(p).trim().length > 0);
                      setAddress(parts.join(", "));
                      if (!name.trim()) setName(agence.name);
                    }
                  }}
                  className={formFieldInputClassName}
                  required
                >
                  <option value="">Choisir une agence</option>
                  {(agences ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {!isEdit && type === "vehicle" ? (
              <div>
                <label className={formFieldLabelClassName}>
                  Véhicule lié <span className="text-red-500">*</span>
                </label>
                <select
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className={formFieldInputClassName}
                  required
                >
                  <option value="">Choisir un véhicule</option>
                  {(vehicles ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} — {v.brand} {v.model}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className={!isEdit && type === "warehouse" ? "sm:col-span-2" : undefined}>
              <label className={formFieldLabelClassName}>Adresse</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Optionnel"
                className={formFieldInputClassName}
              />
            </div>
          </div>
        </FormDialogSection>
      )}
    </FormPage>
  );
}

/** @deprecated use StockLocationFormPage */
export const StockLocationCreatePage = StockLocationFormPage;
