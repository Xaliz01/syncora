"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import type { TechnicianStatus } from "@planwise/shared";
import { useQuery } from "@tanstack/react-query";

const TECHNICIAN_STATUSES: TechnicianStatus[] = ["actif", "inactif"];
import * as fleetApi from "@/lib/fleet.api";
import { useToast } from "@/components/ui/ToastProvider";
import { normalizeCalendarColorHex } from "@/lib/team-calendar-colors";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

const LIST_HREF = "/fleet/technicians";

export function TechnicianFormPage({ technicianId }: { technicianId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(technicianId);
  const detailHref = technicianId ? `${LIST_HREF}/${technicianId}` : LIST_HREF;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["technician", technicianId],
    queryFn: () => fleetApi.getTechnician(technicianId!),
    enabled: isEdit,
  });

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

  useEffect(() => {
    if (!existing) return;
    setFirstName(existing.firstName);
    setLastName(existing.lastName);
    setEmail(existing.email ?? "");
    setPhone(existing.phone ?? "");
    setSpeciality(existing.speciality ?? "");
    setStatus(existing.status);
    setCalendarColor(existing.calendarColor ?? "");
  }, [existing]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit && technicianId) {
        await fleetApi.updateTechnician(technicianId, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          speciality: speciality.trim() || undefined,
          status,
          calendarColor: calendarColor.trim() ? calendarColor.trim() : null,
        });
        showToast("Technicien mis à jour.");
        router.push(detailHref);
      } else {
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
        router.push(`${LIST_HREF}/${created.id}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Impossible de mettre à jour le technicien"
            : "Impossible d'ajouter le technicien",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPage
      title={isEdit ? "Modifier le technicien" : "Ajouter un technicien"}
      description={
        isEdit
          ? "Mettez à jour les informations du technicien."
          : "Renseignez les informations du technicien. Vous pouvez aussi lui envoyer une invitation pour activer un compte utilisateur."
      }
      breadcrumb={{
        href: isEdit ? detailHref : LIST_HREF,
        label: isEdit
          ? [firstName, lastName].filter(Boolean).join(" ").trim() ||
            [existing?.firstName, existing?.lastName].filter(Boolean).join(" ").trim() ||
            "Fiche technicien"
          : "Techniciens",
      }}
      error={error || undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton onClick={() => router.push(detailHref)} disabled={saving} />
          <FormDialogPrimaryButton type="submit" disabled={saving || (isEdit && isLoading)}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter le technicien"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {isEdit && isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : (
        <>
          <FormDialogSection title="Identité et coordonnées">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClassName}>
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Jean"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className={formFieldInputClassName}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClassName}>Email</label>
                <input
                  type="email"
                  placeholder="jean.dupont@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>Téléphone</label>
                <input
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={formFieldInputClassName}
                />
              </div>
            </div>
          </FormDialogSection>

          <FormDialogSection title="Activité et calendrier">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClassName}>Spécialité</label>
                <input
                  type="text"
                  placeholder="Électricien, Plombier..."
                  value={speciality}
                  onChange={(e) => setSpeciality(e.target.value)}
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>Statut</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TechnicianStatus)}
                  className={formFieldInputClassName}
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
              <label className={formFieldLabelClassName}>Couleur au calendrier (optionnel)</label>
              <p className={formFieldHintClassName}>
                Affichée sur les interventions assignées à cette personne. Vide = couleur
                automatique.
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
                  className={`${formFieldInputClassName} mt-0 min-w-[120px] flex-1 font-mono`}
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
          </FormDialogSection>

          {!isEdit ? (
            <FormDialogSection title="Compte utilisateur">
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
                    <label className={formFieldLabelClassName}>
                      Email d&apos;invitation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className={formFieldInputClassName}
                    />
                    <p className={formFieldHintClassName}>
                      Une invitation sera envoyée à cette adresse. Le technicien définira son mot de
                      passe en activant le compte.
                    </p>
                  </div>
                )}
              </div>
            </FormDialogSection>
          ) : null}
        </>
      )}
    </FormPage>
  );
}

export function TechnicianCreatePage() {
  return <TechnicianFormPage />;
}
