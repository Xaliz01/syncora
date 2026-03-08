"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type {
  TechnicianResponse,
  VehicleResponse,
  TechnicianStatus
} from "@syncora/shared";

const TECHNICIAN_STATUSES: TechnicianStatus[] = ["actif", "inactif"];
import * as fleetApi from "@/lib/fleet.api";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  actif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactif: "bg-slate-100 text-slate-500 border-slate-200"
};

export function TechnicianDetailsPage({ technicianId }: { technicianId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [technician, setTechnician] = useState<TechnicianResponse | null>(null);
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSpeciality, setEditSpeciality] = useState("");
  const [editStatus, setEditStatus] = useState<TechnicianStatus>("actif");

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [techData, allVehicles] = await Promise.all([
        fleetApi.getTechnician(technicianId),
        fleetApi.listVehicles()
      ]);
      setTechnician(techData);

      const assignedVehicles = allVehicles.filter((v) =>
        techData.assignedVehicleIds.includes(v.id)
      );
      setVehicles(assignedVehicles);

      setEditFirstName(techData.firstName);
      setEditLastName(techData.lastName);
      setEditEmail(techData.email ?? "");
      setEditPhone(techData.phone ?? "");
      setEditSpeciality(techData.speciality ?? "");
      setEditStatus(techData.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [technicianId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async () => {
    if (!technician) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.updateTechnician(technician.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        speciality: editSpeciality.trim() || undefined,
        status: editStatus
      });
      showToast("Technicien mis à jour.");
      setIsEditing(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de sauvegarder");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!technician || !confirm("Supprimer ce technicien ?")) return;
    try {
      await fleetApi.deleteTechnician(technician.id);
      showToast("Technicien supprimé.");
      router.push("/fleet/technicians");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer");
    }
  };

  const handleCreateAccount = async () => {
    if (!technician) return;
    if (!accountPassword.trim()) {
      setError("Un mot de passe est requis");
      return;
    }
    setCreatingAccount(true);
    setError(null);
    try {
      await fleetApi.createTechnicianUserAccount(technician.id, accountPassword);
      showToast("Compte utilisateur créé pour le technicien.");
      setShowCreateAccount(false);
      setAccountPassword("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le compte");
    } finally {
      setCreatingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Chargement...
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="space-y-3">
        <p className="text-slate-700">Technicien introuvable.</p>
        <Link href="/fleet/technicians" className="text-brand-600 hover:underline">
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
            {technician.firstName} {technician.lastName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Fiche technicien
            {technician.speciality ? ` — ${technician.speciality}` : ""}
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
            href="/fleet/technicians"
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
          <h2 className="font-semibold mb-3">Informations</h2>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <span className="text-slate-400">Prénom</span>
              <p>{technician.firstName}</p>
            </div>
            <div>
              <span className="text-slate-400">Nom</span>
              <p>{technician.lastName}</p>
            </div>
            <div>
              <span className="text-slate-400">Email</span>
              <p>{technician.email || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400">Téléphone</span>
              <p>{technician.phone || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400">Spécialité</span>
              <p>{technician.speciality || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400">Statut</span>
              <p>
                <span
                  className={`inline-flex rounded border px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[technician.status] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}
                >
                  {technician.status}
                </span>
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="font-semibold">Modifier le technicien</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Prénom</label>
              <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Nom</label>
              <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Email</label>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Téléphone</label>
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Spécialité</label>
              <input type="text" value={editSpeciality} onChange={(e) => setEditSpeciality(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Statut</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as TechnicianStatus)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900">
                {TECHNICIAN_STATUSES.map((s) => (
                  <option key={s} value={s}>{s === "actif" ? "Actif" : "Inactif"}</option>
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

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold">Compte utilisateur</h2>
        {technician.userId ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Ce technicien dispose d&apos;un compte utilisateur (ID: <span className="font-mono text-xs">{technician.userId}</span>).
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              Ce technicien n&apos;a pas encore de compte utilisateur.
            </p>
            {!showCreateAccount ? (
              <button
                type="button"
                onClick={() => setShowCreateAccount(true)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
              >
                Créer un compte utilisateur
              </button>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  Créer un compte pour {technician.firstName} {technician.lastName}
                </p>
                {!technician.email && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Ce technicien n&apos;a pas d&apos;adresse email. Veuillez d&apos;abord modifier sa fiche pour ajouter un email.
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={technician.email ?? ""}
                      disabled
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">
                      Mot de passe <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Mot de passe initial"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCreateAccount()}
                    disabled={creatingAccount || !technician.email}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                  >
                    {creatingAccount ? "Création..." : "Créer le compte"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAccount(false);
                      setAccountPassword("");
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold">Véhicules affectés</h2>
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun véhicule affecté.</p>
        ) : (
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/fleet/vehicles/${vehicle.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm hover:bg-slate-100 transition"
              >
                <div>
                  <span className="font-medium text-brand-600">
                    {vehicle.registrationNumber}
                  </span>
                  <span className="ml-2 text-slate-500">
                    {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || vehicle.type}
                  </span>
                </div>
                <span className="text-xs text-slate-400 capitalize">{vehicle.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
