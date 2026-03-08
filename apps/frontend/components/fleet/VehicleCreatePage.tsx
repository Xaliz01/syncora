"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import type { VehicleType, VehicleStatus } from "@syncora/shared";

const VEHICLE_TYPES: VehicleType[] = [
  "camion", "camionnette", "voiture", "utilitaire", "fourgon", "remorque", "autre"
];
const VEHICLE_STATUSES: VehicleStatus[] = ["actif", "maintenance", "hors_service"];
import * as fleetApi from "@/lib/fleet.api";
import { useToast } from "@/components/ui/ToastProvider";

const TYPE_LABELS: Record<string, string> = {
  camion: "Camion",
  camionnette: "Camionnette",
  voiture: "Voiture",
  utilitaire: "Utilitaire",
  fourgon: "Fourgon",
  remorque: "Remorque",
  autre: "Autre"
};

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  maintenance: "Maintenance",
  hors_service: "Hors service"
};

export function VehicleCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await fleetApi.createVehicle({
        type,
        registrationNumber: registrationNumber.trim().toUpperCase(),
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        year: year ? parseInt(year, 10) : undefined,
        color: color.trim() || undefined,
        vin: vin.trim() || undefined,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        status
      });
      showToast("Véhicule ajouté avec succès.");
      router.push("/fleet/vehicles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter le véhicule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Ajouter un véhicule</h1>
        <p className="text-sm text-slate-500">
          Renseignez les informations du véhicule à ajouter à la flotte.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 mb-1">
                Immatriculation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="AA-123-BB"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as VehicleType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t] ?? t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Marque</label>
              <input
                type="text"
                placeholder="Renault, Mercedes..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Modèle</label>
              <input
                type="text"
                placeholder="Master, Sprinter..."
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Année</label>
              <input
                type="number"
                placeholder="2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={1990}
                max={2100}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Couleur</label>
              <input
                type="text"
                placeholder="Blanc, Bleu..."
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Kilométrage</label>
              <input
                type="number"
                placeholder="0"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                min={0}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Numéro VIN</label>
              <input
                type="text"
                placeholder="Numéro d'identification du véhicule"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                {VEHICLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Ajouter le véhicule"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/fleet/vehicles")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Annuler
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
