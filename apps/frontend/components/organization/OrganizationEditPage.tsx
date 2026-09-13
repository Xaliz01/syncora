"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_INVOICE_MENTIONS_FR,
  INVOICE_MENTION_LABELS_FR,
  INVOICE_MENTION_MAX_LENGTH,
} from "@planwise/shared";
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
    legalForm: "",
    shareCapital: "",
    rcsLabel: "",
    vatNumber: "",
    paymentTerms: DEFAULT_INVOICE_MENTIONS_FR.paymentTerms,
    latePenalties: DEFAULT_INVOICE_MENTIONS_FR.latePenalties,
    recoveryIndemnity: DEFAULT_INVOICE_MENTIONS_FR.recoveryIndemnity,
    discount: DEFAULT_INVOICE_MENTIONS_FR.discount,
    vatFranchiseEnabled: false,
    vatFranchise: DEFAULT_INVOICE_MENTIONS_FR.vatFranchise,
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
      legalForm: activeOrganization.legalForm ?? "",
      shareCapital: activeOrganization.shareCapital ?? "",
      rcsLabel: activeOrganization.rcsLabel ?? "",
      vatNumber: activeOrganization.vatNumber ?? "",
      paymentTerms:
        activeOrganization.invoiceMentions?.paymentTerms ??
        DEFAULT_INVOICE_MENTIONS_FR.paymentTerms,
      latePenalties:
        activeOrganization.invoiceMentions?.latePenalties ??
        DEFAULT_INVOICE_MENTIONS_FR.latePenalties,
      recoveryIndemnity:
        activeOrganization.invoiceMentions?.recoveryIndemnity ??
        DEFAULT_INVOICE_MENTIONS_FR.recoveryIndemnity,
      discount:
        activeOrganization.invoiceMentions?.discount ?? DEFAULT_INVOICE_MENTIONS_FR.discount,
      vatFranchiseEnabled: Boolean(activeOrganization.invoiceMentions?.vatFranchise),
      vatFranchise:
        activeOrganization.invoiceMentions?.vatFranchise ??
        DEFAULT_INVOICE_MENTIONS_FR.vatFranchise,
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
        legalForm: form.legalForm.trim() || null,
        shareCapital: form.shareCapital.trim() || null,
        rcsLabel: form.rcsLabel.trim() || null,
        vatNumber: form.vatNumber.trim() || null,
        invoiceMentions: {
          paymentTerms: form.paymentTerms.trim(),
          latePenalties: form.latePenalties.trim(),
          recoveryIndemnity: form.recoveryIndemnity.trim(),
          discount: form.discount.trim(),
          vatFranchise: form.vatFranchiseEnabled ? form.vatFranchise.trim() : "",
        },
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

      <FormDialogSection title="Facturation et mentions légales">
        <p className={formFieldHintClassName}>
          Textes types du droit français pour vos factures. Adaptez-les à votre activité si besoin
          (expert-comptable ou avocat). Les factures déjà émises conservent les mentions de
          l’époque.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="org-edit-legal-form" className={formFieldLabelClassName}>
              Forme juridique
            </label>
            <input
              id="org-edit-legal-form"
              type="text"
              value={form.legalForm}
              onChange={(e) => setForm((prev) => ({ ...prev, legalForm: e.target.value }))}
              className={formFieldInputClassName}
              placeholder="SAS, SARL, entrepreneur individuel…"
            />
          </div>
          <div>
            <label htmlFor="org-edit-capital" className={formFieldLabelClassName}>
              Capital social
            </label>
            <input
              id="org-edit-capital"
              type="text"
              value={form.shareCapital}
              onChange={(e) => setForm((prev) => ({ ...prev, shareCapital: e.target.value }))}
              className={formFieldInputClassName}
              placeholder="Ex. 10 000 €"
            />
          </div>
          <div>
            <label htmlFor="org-edit-rcs" className={formFieldLabelClassName}>
              RCS
            </label>
            <input
              id="org-edit-rcs"
              type="text"
              value={form.rcsLabel}
              onChange={(e) => setForm((prev) => ({ ...prev, rcsLabel: e.target.value }))}
              className={formFieldInputClassName}
              placeholder="Ex. RCS Brest 979 102 803"
            />
          </div>
          <div>
            <label htmlFor="org-edit-vat" className={formFieldLabelClassName}>
              N° TVA intracommunautaire
            </label>
            <input
              id="org-edit-vat"
              type="text"
              value={form.vatNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, vatNumber: e.target.value }))}
              className={formFieldInputClassName}
              placeholder="Ex. FR11979102803"
            />
          </div>
        </div>

        {(
          [
            ["paymentTerms", "paymentTerms"],
            ["latePenalties", "latePenalties"],
            ["recoveryIndemnity", "recoveryIndemnity"],
            ["discount", "discount"],
          ] as const
        ).map(([field, key]) => (
          <div key={field}>
            <label htmlFor={`org-edit-${field}`} className={formFieldLabelClassName}>
              {INVOICE_MENTION_LABELS_FR[key]}
            </label>
            <textarea
              id={`org-edit-${field}`}
              value={form[field]}
              onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
              rows={3}
              maxLength={INVOICE_MENTION_MAX_LENGTH}
              className={formFieldInputClassName}
            />
          </div>
        ))}

        <div>
          <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.vatFranchiseEnabled}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, vatFranchiseEnabled: e.target.checked }))
              }
            />
            <span>
              Franchise en base de TVA (art. 293 B du CGI)
              <span className={`block ${formFieldHintClassName}`}>
                Cochez si vous n’êtes pas assujetti à la TVA.
              </span>
            </span>
          </label>
          {form.vatFranchiseEnabled ? (
            <textarea
              id="org-edit-vatFranchise"
              value={form.vatFranchise}
              onChange={(e) => setForm((prev) => ({ ...prev, vatFranchise: e.target.value }))}
              rows={2}
              maxLength={INVOICE_MENTION_MAX_LENGTH}
              className={`${formFieldInputClassName} mt-2`}
              aria-label={INVOICE_MENTION_LABELS_FR.vatFranchise}
            />
          ) : null}
        </div>

        <div>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                paymentTerms: DEFAULT_INVOICE_MENTIONS_FR.paymentTerms,
                latePenalties: DEFAULT_INVOICE_MENTIONS_FR.latePenalties,
                recoveryIndemnity: DEFAULT_INVOICE_MENTIONS_FR.recoveryIndemnity,
                discount: DEFAULT_INVOICE_MENTIONS_FR.discount,
                vatFranchise: DEFAULT_INVOICE_MENTIONS_FR.vatFranchise,
              }))
            }
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Restaurer les mentions par défaut
          </button>
        </div>
      </FormDialogSection>
    </FormPage>
  );
}
