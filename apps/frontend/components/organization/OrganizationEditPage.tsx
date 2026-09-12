"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useOrganization } from "@/lib/organization";
import { useToast } from "@/components/ui/ToastProvider";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";
import * as organizationsApi from "@/lib/organizations.api";
import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

const DETAIL_HREF = "/organization";

export function OrganizationEditPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeOrganization, isLoading } = useOrganization();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    country: "",
  });

  useEffect(() => {
    if (!activeOrganization) return;
    setForm({
      name: activeOrganization.name ?? "",
      email: activeOrganization.email ?? "",
      phone: activeOrganization.phone ?? "",
      addressLine1: activeOrganization.addressLine1 ?? "",
      addressLine2: activeOrganization.addressLine2 ?? "",
      postalCode: activeOrganization.postalCode ?? "",
      city: activeOrganization.city ?? "",
      country: activeOrganization.country ?? "",
    });
  }, [activeOrganization]);

  const updateMutation = useMutation({
    mutationFn: () =>
      organizationsApi.updateMine({
        name: form.name.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        addressLine1: form.addressLine1.trim() || null,
        addressLine2: form.addressLine2.trim() || null,
        postalCode: form.postalCode.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
      }),
    onSuccess: () => {
      showToast("Coordonnées de l’organisation mises à jour.");
      void queryClient.invalidateQueries({ queryKey: ["organizations", "mine"] });
      void queryClient.invalidateQueries({
        queryKey: ["organizations", "mine", user?.organizationId],
      });
      router.push(DETAIL_HREF);
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Impossible de mettre à jour l’organisation.", "error");
    },
  });

  const canSave = useMemo(
    () => form.name.trim().length > 0 && form.email.trim().includes("@"),
    [form.name, form.email],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave || updateMutation.isPending) return;
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <PlanwiseLoader size="md" label="Chargement…" />
      </div>
    );
  }

  const orgLabel = activeOrganization?.name?.trim() || "Mon organisation";

  return (
    <FormPage
      title="Modifier l’organisation"
      description="Mettez à jour les coordonnées de votre espace Planwise."
      breadcrumb={{ href: DETAIL_HREF, label: orgLabel }}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton
            onClick={() => router.push(DETAIL_HREF)}
            disabled={updateMutation.isPending}
          />
          <FormDialogPrimaryButton type="submit" disabled={!canSave || updateMutation.isPending}>
            {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      <FormDialogSection title="Identité">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="org-edit-name" className={formFieldLabelClassName}>
              Nom de l’organisation
            </label>
            <input
              id="org-edit-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={formFieldInputClassName}
              autoComplete="organization"
            />
          </div>
          <div>
            <label htmlFor="org-edit-siret" className={formFieldLabelClassName}>
              SIRET
            </label>
            <input
              id="org-edit-siret"
              type="text"
              value={activeOrganization?.siret ?? ""}
              readOnly
              disabled
              className={formFieldInputClassName}
            />
            <p className={formFieldHintClassName}>Le SIRET ne peut pas être modifié.</p>
          </div>
          <div>
            <label htmlFor="org-edit-email" className={formFieldLabelClassName}>
              E-mail de facturation
            </label>
            <input
              id="org-edit-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className={formFieldInputClassName}
              autoComplete="organization"
            />
            <p className={formFieldHintClassName}>
              Obligatoire pour la facturation. L&apos;utilisation de Planwise n&apos;aura aucun coût
              durant la beta.
            </p>
          </div>
          <div>
            <label htmlFor="org-edit-phone" className={formFieldLabelClassName}>
              Téléphone
            </label>
            <input
              id="org-edit-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className={formFieldInputClassName}
              autoComplete="tel"
            />
          </div>
        </div>
      </FormDialogSection>

      <FormDialogSection title="Adresse">
        <PostalAddressFields
          line1={form.addressLine1}
          line2={form.addressLine2}
          postalCode={form.postalCode}
          city={form.city}
          country={form.country}
          onLine1Change={(v) => setForm((prev) => ({ ...prev, addressLine1: v }))}
          onLine2Change={(v) => setForm((prev) => ({ ...prev, addressLine2: v }))}
          onPostalChange={(v) => setForm((prev) => ({ ...prev, postalCode: v }))}
          onCityChange={(v) => setForm((prev) => ({ ...prev, city: v }))}
          onCountryChange={(v) => setForm((prev) => ({ ...prev, country: v }))}
          labelCls={formFieldLabelClassName}
          inputCls={formFieldInputClassName}
        />
      </FormDialogSection>
    </FormPage>
  );
}
