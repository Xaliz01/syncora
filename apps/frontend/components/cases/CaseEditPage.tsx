"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import * as customersApi from "@/lib/customers.api";
import { listOrganizationUsers } from "@/lib/admin.api";
import { CaseAssigneesTagsInput } from "@/components/cases/CaseAssigneesTagsInput";
import { CaseCustomerPicker } from "@/components/cases/CaseCustomerPicker";
import { CaseOrderGiverPicker } from "@/components/cases/CaseOrderGiverPicker";
import { CaseInterventionSitePicker } from "@/components/cases/CaseInterventionSitePicker";
import type { CasePriority, CustomerSiteResponse } from "@planwise/shared";
import { useToast } from "@/components/ui/ToastProvider";
import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";
import { ResourceNotFoundPanel } from "@/components/ui/AppErrorAlert";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

export function CaseEditPage({ caseId }: { caseId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const detailHref = `/cases/${caseId}`;

  const {
    data: caseData,
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => api.getCase(caseId),
  });

  const { data: usersData } = useQuery({
    queryKey: ["organization-users"],
    queryFn: () => listOrganizationUsers(),
  });

  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CasePriority>("medium");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [orderGiverId, setOrderGiverId] = useState("");
  const [interventionSiteId, setInterventionSiteId] = useState("");
  const [customerSites, setCustomerSites] = useState<CustomerSiteResponse[]>([]);
  const [error, setError] = useState("");

  const [hydratedCaseId, setHydratedCaseId] = useState<string | null>(null);

  // Hydrater une fois par dossier : un reset sur chaque refetch écraserait une
  // sélection à la volée (client / donneur d’ordre) avant enregistrement.
  useEffect(() => {
    if (!caseData || hydratedCaseId === caseData.id) return;
    setDescription(caseData.description ?? "");
    setPriority(caseData.priority);
    setAssigneeIds(caseData.assignees.map((a) => a.userId));
    setDueDate(caseData.dueDate ? caseData.dueDate.split("T")[0] : "");
    setTagsInput((caseData.tags ?? []).join(", "));
    setCustomerId(caseData.customerId ?? "");
    setOrderGiverId(caseData.orderGiverId ?? "");
    setInterventionSiteId(caseData.interventionSiteId ?? "");
    setCustomerSites(caseData.customer?.sites ?? []);
    setHydratedCaseId(caseData.id);
  }, [caseData, hydratedCaseId]);

  const assigneeOptions = useMemo(
    () =>
      (usersData?.users ?? []).map((u) => ({
        id: u.id,
        label: u.name?.trim() || u.email,
      })),
    [usersData?.users],
  );

  const updateMutation = useMutation({
    mutationFn: (payload: api.UpdateCasePayload) => api.updateCase(caseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      showToast("Dossier mis à jour.");
      router.push(detailHref);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleCustomerChange = (newCustomerId: string) => {
    setCustomerId(newCustomerId);
    setInterventionSiteId("");
    if (newCustomerId) {
      void customersApi.getCustomer(newCustomerId).then((c) => {
        setCustomerSites(c.sites ?? []);
        const defaultSite = c.sites?.find((s) => s.isDefault);
        if (defaultSite) setInterventionSiteId(defaultSite.id);
      });
    } else {
      setCustomerSites([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    updateMutation.mutate({
      description: description.trim() || undefined,
      priority,
      assigneeIds,
      dueDate: dueDate || null,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      customerId: customerId.trim() ? customerId.trim() : null,
      orderGiverId: orderGiverId.trim() ? orderGiverId.trim() : null,
      interventionSiteId: interventionSiteId || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <PlanwiseLoader size="md" label="Chargement…" />
      </div>
    );
  }

  if (isError || !caseData) {
    return (
      <ResourceNotFoundPanel
        error={isError ? loadError : undefined}
        resourceLabel="Dossier"
        backHref="/cases"
        backLabel="Retour aux dossiers"
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <FormPage
      title="Modifier le dossier"
      description="Mettez à jour les informations du dossier. Le statut se change depuis la fiche (progression)."
      breadcrumb={{ href: detailHref, label: caseData.title }}
      error={error || undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton
            onClick={() => router.push(detailHref)}
            disabled={updateMutation.isPending}
          />
          <FormDialogPrimaryButton type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <FormDialogSection title="Dossier" id="case-edit-details">
          <div>
            <p className={formFieldLabelClassName}>Numéro de dossier</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              {caseData.caseNumber}
              <TestDataBadgeIf isTestData={caseData.isTestData} />
            </p>
          </div>

          <div>
            <label htmlFor="case-edit-description" className={formFieldLabelClassName}>
              Description
            </label>
            <textarea
              id="case-edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={formFieldInputClassName}
              placeholder="Description du dossier…"
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="case-edit-priority" className={formFieldLabelClassName}>
                Priorité
              </label>
              <select
                id="case-edit-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as CasePriority)}
                className={formFieldInputClassName}
                disabled={updateMutation.isPending}
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label htmlFor="case-edit-due-date" className={formFieldLabelClassName}>
                Échéance
              </label>
              <input
                id="case-edit-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={formFieldInputClassName}
                disabled={updateMutation.isPending}
              />
              <p className={formFieldHintClassName}>Laisser vide si aucune échéance fixée.</p>
            </div>
          </div>

          <div>
            <label htmlFor="case-edit-tags" className={formFieldLabelClassName}>
              Tags
            </label>
            <input
              id="case-edit-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className={formFieldInputClassName}
              placeholder="ceed, audit, rénovation…"
              disabled={updateMutation.isPending}
            />
            <p className={formFieldHintClassName}>Séparez les tags par des virgules.</p>
          </div>
        </FormDialogSection>

        <FormDialogSection title="Parties prenantes" id="case-edit-parties">
          <div>
            <span className={formFieldLabelClassName}>Assignés (optionnel)</span>
            <p className={formFieldHintClassName}>
              Saisissez un nom ou un e-mail pour ajouter des membres sous forme de tags.
            </p>
            <div className="mt-1">
              {assigneeOptions.length > 0 ? (
                <CaseAssigneesTagsInput
                  options={assigneeOptions}
                  value={assigneeIds}
                  onChange={setAssigneeIds}
                  placeholder="Rechercher un membre à assigner…"
                />
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Aucun utilisateur dans l&apos;organisation.
                </p>
              )}
            </div>
          </div>

          <CaseCustomerPicker
            idPrefix="case-edit-customer"
            value={customerId}
            initialDisplayName={caseData.customer?.displayName}
            onChange={handleCustomerChange}
            disabled={updateMutation.isPending}
          />

          <CaseOrderGiverPicker
            idPrefix="case-edit-order-giver"
            value={orderGiverId}
            initialDisplayName={caseData.orderGiver?.displayName}
            onChange={setOrderGiverId}
            disabled={updateMutation.isPending}
          />

          {customerId && customerSites.length > 0 ? (
            <CaseInterventionSitePicker
              sites={customerSites}
              value={interventionSiteId}
              onChange={setInterventionSiteId}
              disabled={updateMutation.isPending}
            />
          ) : null}
        </FormDialogSection>
      </div>
    </FormPage>
  );
}
