"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import type { TechnicianStatus } from "@planwise/shared";

const TECHNICIAN_STATUSES: TechnicianStatus[] = ["actif", "inactif"];
import * as fleetApi from "@/lib/fleet.api";
import { useToast } from "@/components/ui/ToastProvider";
import { normalizeCalendarColorHex } from "@/lib/team-calendar-colors";

export function TechnicianCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [status, setStatus] = useState<TechnicianStatus>("actif");
  const [calendarColor, setCalendarColor] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (createAccount && !email.trim()) {
        throw new Error("Une adresse email est requise pour inviter un utilisateur");
      }
      const created = await fleetApi.createTechnician({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        speciality: speciality.trim() || undefined,
        status,
        calendarColor: calendarColor.trim() || undefined,
        createUserAccount: createAccount,
      });
      if (createAccount) {
        showToast(
          created.emailSent
            ? "Technicien ajouté. Invitation envoyée par e-mail."
            : "Technicien ajouté, mais l'e-mail d'invitation n'a pas pu être envoyé. Vous pourrez le renvoyer depuis la liste des utilisateurs.",
          created.emailSent ? undefined : "error",
        );
      } else {
        showToast("Technicien ajouté avec succès.");
      }
      router.push("/fleet/technicians");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter le technicien");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Ajouter un technicien</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Renseignez les informations du technicien. Vous pouvez aussi lui envoyer une invitation
          pour activer un compte utilisateur.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Dupont"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="jean.dupont@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                placeholder="06 12 34 56 78"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Spécialité
              </label>
              <input
                type="text"
                placeholder="Électricien, Plombier..."
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Statut
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TechnicianStatus)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                {TECHNICIAN_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s === "actif" ? "Actif" : "Inactif"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 p-4 space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Couleur au calendrier (optionnel)
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Affichée sur les interventions assignées à cette personne. Vide = couleur automatique.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                aria-label="Couleur calendrier"
                className="h-10 w-14 cursor-pointer rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                value={normalizeCalendarColorHex(calendarColor) ?? "#94a3b8"}
                onChange={(e) => setCalendarColor(e.target.value)}
              />
              <input
                type="text"
                placeholder="#RRGGBB"
                value={calendarColor}
                onChange={(e) => setCalendarColor(e.target.value)}
                className="flex-1 min-w-[120px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setCalendarColor("")}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Automatique
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={createAccount}
                onChange={(e) => setCreateAccount(e.target.checked)}
              />
              Inviter un utilisateur pour ce technicien
            </label>
            {createAccount && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Email d&apos;invitation <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-500 dark:text-slate-400"
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Une invitation sera envoyée à cette adresse. Le technicien définira son mot de
                  passe en activant le compte.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/fleet/technicians")}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              {saving ? "Enregistrement..." : "Ajouter le technicien"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
