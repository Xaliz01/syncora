"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";
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

const LIST_HREF = "/fleet/agences";

export function AgenceFormPage({ agenceId }: { agenceId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(agenceId);
  const detailHref = agenceId ? `${LIST_HREF}/${agenceId}` : LIST_HREF;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["agence", agenceId],
    queryFn: () => fleetApi.getAgence(agenceId!),
    enabled: isEdit,
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setAddress(existing.address ?? "");
    setCity(existing.city ?? "");
    setPostalCode(existing.postalCode ?? "");
    setPhone(existing.phone ?? "");
  }, [existing]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        phone: phone.trim() || undefined,
      };
      if (isEdit && agenceId) {
        await fleetApi.updateAgence(agenceId, payload);
        showToast("Agence mise à jour.");
        router.push(detailHref);
      } else {
        const created = await fleetApi.createAgence(payload);
        showToast("Agence créée avec succès.");
        router.push(`${LIST_HREF}/${created.id}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Impossible de mettre à jour l'agence"
            : "Impossible de créer l'agence",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPage
      title={isEdit ? "Modifier l'agence" : "Ajouter une agence"}
      description={
        isEdit
          ? "Mettez à jour les informations de l'agence."
          : "Renseignez les informations de l'agence (site, base)."
      }
      breadcrumb={{
        href: isEdit ? detailHref : LIST_HREF,
        label: isEdit ? name.trim() || existing?.name || "Fiche agence" : "Agences",
      }}
      error={error || undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton onClick={() => router.push(detailHref)} disabled={saving} />
          <FormDialogPrimaryButton type="submit" disabled={saving || (isEdit && isLoading)}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter l'agence"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {isEdit && isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : (
        <>
          <FormDialogSection title="Agence">
            <div>
              <label className={formFieldLabelClassName}>
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Agence Paris Nord"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={formFieldInputClassName}
              />
            </div>
          </FormDialogSection>

          <FormDialogSection title="Adresse et contact">
            <PostalAddressFields
              legend="Adresse du site (Base Adresse Nationale)"
              line1={address}
              line2=""
              postalCode={postalCode}
              city={city}
              country="FR"
              onLine1Change={setAddress}
              onLine2Change={() => {}}
              onPostalChange={setPostalCode}
              onCityChange={setCity}
              onCountryChange={() => {}}
              showLine2={false}
              showCountry={false}
              labelCls={formFieldLabelClassName}
              inputCls={formFieldInputClassName}
            />

            <div>
              <label className={formFieldLabelClassName}>Téléphone</label>
              <input
                type="tel"
                placeholder="01 23 45 67 89"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={formFieldInputClassName}
              />
            </div>
          </FormDialogSection>
        </>
      )}
    </FormPage>
  );
}

export function AgenceCreatePage() {
  return <AgenceFormPage />;
}
