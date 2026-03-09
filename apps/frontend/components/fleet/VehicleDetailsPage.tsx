"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type {
  VehicleResponse,
  TechnicianResponse,
  TeamResponse,
  VehicleType,
  VehicleStatus
} from "@syncora/shared";

const VEHICLE_TYPES: VehicleType[] = [
  "camion", "camionnette", "voiture", "utilitaire", "fourgon", "remorque", "autre"
];
const VEHICLE_STATUSES: VehicleStatus[] = ["actif", "maintenance", "hors_service"];
import * as fleetApi from "@/lib/fleet.api";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";

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

const STATUS_COLORS: Record<string, string> = {
  actif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  hors_service: "bg-red-50 text-red-700 border-red-200"
};

export function VehicleDetailsPage({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianResponse[]>([]);
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [assignedTechnician, setAssignedTechnician] = useState<TechnicianResponse | null>(null);
  const [assignedTeam, setAssignedTeam] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editType, setEditType] = useState<VehicleType>("camion");
  const [editReg, setEditReg] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editVin, setEditVin] = useState("");
  const [editMileage, setEditMileage] = useState("");
  const [editStatus, setEditStatus] = useState<VehicleStatus>("actif");

  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vehicleData, techList, teamList] = await Promise.all([
        fleetApi.getVehicle(vehicleId),
        fleetApi.listTechnicians(),
        fleetApi.listTeams()
      ]);
      setVehicle(vehicleData);
      setTechnicians(techList);
      setTeams(teamList);

      setEditType(vehicleData.type);
      setEditReg(vehicleData.registrationNumber);
      setEditBrand(vehicleData.brand ?? "");
      setEditModel(vehicleData.model ?? "");
      setEditYear(vehicleData.year?.toString() ?? "");
      setEditColor(vehicleData.color ?? "");
      setEditVin(vehicleData.vin ?? "");
      setEditMileage(vehicleData.mileage?.toString() ?? "");
      setEditStatus(vehicleData.status);

      if (vehicleData.assignedTechnicianId) {
        const tech = techList.find((t) => t.id === vehicleData.assignedTechnicianId) ?? null;
        setAssignedTechnician(tech);
        setSelectedTechnicianId(vehicleData.assignedTechnicianId);
      } else {
        setAssignedTechnician(null);
        setSelectedTechnicianId("");
      }

      if (vehicleData.assignedTeamId) {
        const team = teamList.find((t) => t.id === vehicleData.assignedTeamId) ?? null;
        setAssignedTeam(team);
        setSelectedTeamId(vehicleData.assignedTeamId);
      } else {
        setAssignedTeam(null);
        setSelectedTeamId("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async () => {
    if (!vehicle) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.updateVehicle(vehicle.id, {
        type: editType,
        registrationNumber: editReg.trim().toUpperCase(),
        brand: editBrand.trim() || undefined,
        model: editModel.trim() || undefined,
        year: editYear ? parseInt(editYear, 10) : undefined,
        color: editColor.trim() || undefined,
        vin: editVin.trim() || undefined,
        mileage: editMileage ? parseInt(editMileage, 10) : undefined,
        status: editStatus
      });
      showToast("Véhicule mis à jour.");
      setIsEditing(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de sauvegarder");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!vehicle || !selectedTechnicianId) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.assignTechnicianToVehicle(vehicle.id, selectedTechnicianId);
      showToast("Technicien affecté au véhicule.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'affecter le technicien");
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!vehicle) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.unassignTechnicianFromVehicle(vehicle.id);
      showToast("Technicien désaffecté.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de désaffecter");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTeam = async () => {
    if (!vehicle || !selectedTeamId) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.assignTeamToVehicle(vehicle.id, selectedTeamId);
      showToast("Équipe affectée au véhicule.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'affecter l'équipe");
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignTeam = async () => {
    if (!vehicle) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.unassignTeamFromVehicle(vehicle.id);
      showToast("Équipe désaffectée.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de désaffecter");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicle || !confirm("Supprimer ce véhicule ?")) return;
    try {
      await fleetApi.deleteVehicle(vehicle.id);
      showToast("Véhicule supprimé.");
      router.push("/fleet/vehicles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Chargement...
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="space-y-3">
        <p className="text-slate-700">Véhicule introuvable.</p>
        <Link href="/fleet/vehicles" className="text-brand-600 hover:underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">
            {vehicle.registrationNumber}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {TYPE_LABELS[vehicle.type] ?? vehicle.type}
            {vehicle.brand ? ` — ${vehicle.brand}` : ""}
            {vehicle.model ? ` ${vehicle.model}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing((p) => !p)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {isEditing ? "Annuler" : "Modifier"}
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Supprimer
          </button>
          <Link
            href="/fleet/vehicles"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Retour
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      {!isEditing ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold mb-3">Informations du véhicule</h2>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <span className="text-slate-400">Immatriculation</span>
              <p className="font-medium">{vehicle.registrationNumber}</p>
            </div>
            <div>
              <span className="text-slate-400">Type</span>
              <p>{TYPE_LABELS[vehicle.type] ?? vehicle.type}</p>
            </div>
            <div>
              <span className="text-slate-400">Marque</span>
              <p>{vehicle.brand || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400">Modèle</span>
              <p>{vehicle.model || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400">Année</span>
              <p>{vehicle.year ?? "—"}</p>
            </div>
            <div>
              <span className="text-slate-400">Couleur</span>
              <p>{vehicle.color || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400">VIN</span>
              <p className="font-mono text-xs">{vehicle.vin || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400">Kilométrage</span>
              <p>{vehicle.mileage != null ? `${vehicle.mileage.toLocaleString("fr-FR")} km` : "—"}</p>
            </div>
            <div>
              <span className="text-slate-400">Statut</span>
              <p>
                <span
                  className={`inline-flex rounded border px-2 py-0.5 text-xs ${STATUS_COLORS[vehicle.status] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}
                >
                  {STATUS_LABELS[vehicle.status] ?? vehicle.status}
                </span>
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="font-semibold">Modifier le véhicule</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Immatriculation</label>
              <input
                type="text"
                value={editReg}
                onChange={(e) => setEditReg(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as VehicleType)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Marque</label>
              <input type="text" value={editBrand} onChange={(e) => setEditBrand(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Modèle</label>
              <input type="text" value={editModel} onChange={(e) => setEditModel(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Année</label>
              <input type="number" value={editYear} onChange={(e) => setEditYear(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Couleur</label>
              <input type="text" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Kilométrage</label>
              <input type="number" value={editMileage} onChange={(e) => setEditMileage(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 mb-1">VIN</label>
              <input type="text" value={editVin} onChange={(e) => setEditVin(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Statut</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as VehicleStatus)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900">
                {VEHICLE_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <h2 className="font-semibold">Technicien affecté</h2>
        {assignedTechnician ? (
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/fleet/technicians/${assignedTechnician.id}`}
                className="font-medium text-brand-600 hover:text-brand-500 hover:underline"
              >
                {assignedTechnician.firstName} {assignedTechnician.lastName}
              </Link>
              {assignedTechnician.speciality && (
                <span className="ml-2 text-sm text-slate-500">({assignedTechnician.speciality})</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleUnassign()}
              disabled={saving}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Désaffecter
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm text-slate-500 mb-1">Affecter un technicien</label>
              <select
                value={selectedTechnicianId}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
              >
                <option value="">Sélectionner un technicien</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.firstName} {tech.lastName}
                    {tech.speciality ? ` (${tech.speciality})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleAssign()}
              disabled={saving || !selectedTechnicianId}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              Affecter
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <h2 className="font-semibold">Équipe affectée</h2>
        {assignedTeam ? (
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/fleet/teams/${assignedTeam.id}`}
                className="font-medium text-brand-600 hover:text-brand-500 hover:underline"
              >
                {assignedTeam.name}
              </Link>
              <span className="ml-2 text-sm text-slate-500">
                ({assignedTeam.technicianIds.length} membre{assignedTeam.technicianIds.length !== 1 ? "s" : ""})
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleUnassignTeam()}
              disabled={saving}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Désaffecter
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm text-slate-500 mb-1">Affecter une équipe</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
              >
                <option value="">Sélectionner une équipe</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.agenceName ? ` (${team.agenceName})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleAssignTeam()}
              disabled={saving || !selectedTeamId}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              Affecter
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
