"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { AgenceResponse, TeamResponse } from "@syncora/shared";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";
import * as fleetApi from "@/lib/fleet.api";
import { useToast } from "@/components/ui/ToastProvider";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useRouter } from "next/navigation";

export function AgenceDetailsPage({ agenceId }: { agenceId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const [agence, setAgence] = useState<AgenceResponse | null>(null);
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agenceData, teamList] = await Promise.all([
        fleetApi.getAgence(agenceId),
        fleetApi.listTeams(),
      ]);
      setAgence(agenceData);
      setTeams(teamList.filter((t) => t.agenceId === agenceId));

      setEditName(agenceData.name);
      setEditAddress(agenceData.address ?? "");
      setEditCity(agenceData.city ?? "");
      setEditPostalCode(agenceData.postalCode ?? "");
      setEditPhone(agenceData.phone ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [agenceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async () => {
    if (!agence) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.updateAgence(agence.id, {
        name: editName.trim(),
        address: editAddress.trim() || undefined,
        city: editCity.trim() || undefined,
        postalCode: editPostalCode.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });
      showToast("Agence mise à jour.");
      setIsEditing(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de sauvegarder");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!agence || !confirm("Supprimer cette agence ?")) return;
    try {
      await fleetApi.deleteAgence(agence.id);
      showToast("Agence supprimée.");
      router.push("/fleet/agences");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">
        Chargement...
      </div>
    );
  }

  if (!agence) {
    return (
      <div className="space-y-3">
        <p className="text-slate-700 dark:text-slate-200">Agence introuvable.</p>
        <Link href="/fleet/agences" className="text-brand-600 dark:text-brand-400 hover:underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">{agence.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fiche agence
            {agence.city ? ` — ${agence.city}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can("agences.update") && (
            <button
              type="button"
              onClick={() => setIsEditing((p) => !p)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {isEditing ? "Annuler" : "Modifier"}
            </button>
          )}
          {can("agences.delete") && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Supprimer
            </button>
          )}
          <Link
            href="/fleet/agences"
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
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
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h2 className="font-semibold mb-3">Informations</h2>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <span className="text-slate-400 dark:text-slate-500">Nom</span>
              <p className="font-medium">{agence.name}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Adresse</span>
              <p>{agence.address || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Ville</span>
              <p>{agence.city || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Code postal</span>
              <p>{agence.postalCode || "—"}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Téléphone</span>
              <p>{agence.phone || "—"}</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
          <h2 className="font-semibold">Modifier l&apos;agence</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Nom</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <PostalAddressFields
              legend="Adresse du site (Base Adresse Nationale)"
              line1={editAddress}
              line2=""
              postalCode={editPostalCode}
              city={editCity}
              country="FR"
              onLine1Change={setEditAddress}
              onLine2Change={() => {}}
              onPostalChange={setEditPostalCode}
              onCityChange={setEditCity}
              onCountryChange={() => {}}
              showLine2={false}
              showCountry={false}
              labelCls="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
              inputCls="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
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

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="font-semibold">Équipes rattachées</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucune équipe rattachée à cette agence.
          </p>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/fleet/teams/${team.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm hover:bg-slate-100 dark:bg-slate-800 transition"
              >
                <span className="font-medium text-brand-600 dark:text-brand-400">{team.name}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {team.technicianIds.length} membre{team.technicianIds.length !== 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
