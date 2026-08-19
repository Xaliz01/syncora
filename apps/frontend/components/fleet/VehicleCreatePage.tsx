"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import type { VehicleType, VehicleStatus } from "@planwise/shared";
import { useQuery } from "@tanstack/react-query";

const VEHICLE_TYPES: VehicleType[] = [
  "camion",
  "camionnette",
  "voiture",
  "utilitaire",
  "fourgon",
  "remorque",
  "autre",
];
const VEHICLE_STATUSES: VehicleStatus[] = ["actif", "maintenance", "hors_service"];
import * as fleetApi from "@/lib/fleet.api";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

const TYPE_LABELS: Record<string, string> = {
  camion: "Camion",
  camionnette: "Camionnette",
  voiture: "Voiture",
  utilitaire: "Utilitaire",
  fourgon: "Fourgon",
  remorque: "Remorque",
  autre: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  maintenance: "Maintenance",
  hors_service: "Hors service",
};

const LIST_HREF = "/fleet/vehicles";

export function VehicleFormPage({ vehicleId }: { vehicleId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(vehicleId);
  const detailHref = vehicleId ? `${LIST_HREF}/${vehicleId}` : LIST_HREF;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => fleetApi.getVehicle(vehicleId!),
    enabled: isEdit,
  });

  const [type, setType] = useState<VehicleType>("camion");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [status, setStatus] = useState<VehicleStatus>("actif");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setType(existing.type);
    setRegistrationNumber(existing.registrationNumber);
    setBrand(existing.brand ?? "");
    setModel(existing.model ?? "");
    setYear(existing.year?.toString() ?? "");
    setColor(existing.color ?? "");
    setVin(existing.vin ?? "");
    setMileage(existing.mileage?.toString() ?? "");
    setStatus(existing.status);
  }, [existing]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type,
        registrationNumber: registrationNumber.trim().toUpperCase(),
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        year: year ? parseInt(year, 10) : undefined,
        color: color.trim() || undefined,
        vin: vin.trim() || undefined,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        status,
      };
      if (isEdit && vehicleId) {
        await fleetApi.updateVehicle(vehicleId, payload);
        showToast("Véhicule mis à jour.");
        router.push(detailHref);
      } else {
        const created = await fleetApi.createVehicle(payload);
        showToast("Véhicule ajouté avec succès.");
        router.push(`${LIST_HREF}/${created.id}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Impossible de mettre à jour le véhicule"
            : "Impossible d'ajouter le véhicule",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPage
      title={isEdit ? "Modifier le véhicule" : "Ajouter un véhicule"}
      description={
        isEdit
          ? "Mettez à jour les informations du véhicule."
          : "Renseignez les informations du véhicule à ajouter à la flotte."
      }
      breadcrumb={{
        href: isEdit ? detailHref : LIST_HREF,
        label: isEdit
          ? registrationNumber.trim() || existing?.registrationNumber || "Fiche véhicule"
          : "Véhicules",
      }}
      error={error || undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton onClick={() => router.push(detailHref)} disabled={saving} />
          <FormDialogPrimaryButton type="submit" disabled={saving || (isEdit && isLoading)}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter le véhicule"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {isEdit && isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : (
        <>
          <FormDialogSection title="Identification">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClassName}>
                  Immatriculation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="AA-123-BB"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  required
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as VehicleType)}
                  className={formFieldInputClassName}
                >
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t] ?? t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </FormDialogSection>

          <FormDialogSection title="Caractéristiques">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClassName}>Marque</label>
                <input
                  type="text"
                  placeholder="Renault, Mercedes..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>Modèle</label>
                <input
                  type="text"
                  placeholder="Master, Sprinter..."
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={formFieldInputClassName}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={formFieldLabelClassName}>Année</label>
                <input
                  type="number"
                  placeholder="2024"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={1990}
                  max={2100}
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>Couleur</label>
                <input
                  type="text"
                  placeholder="Blanc, Bleu..."
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>Kilométrage</label>
                <input
                  type="number"
                  placeholder="0"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  min={0}
                  className={formFieldInputClassName}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClassName}>Numéro VIN</label>
                <input
                  type="text"
                  placeholder="Numéro d'identification du véhicule"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>Statut</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                  className={formFieldInputClassName}
                >
                  {VEHICLE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </FormDialogSection>
        </>
      )}
    </FormPage>
  );
}

export function VehicleCreatePage() {
  return <VehicleFormPage />;
}
