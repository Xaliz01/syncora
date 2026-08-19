"use client";

import React, { useMemo, useState } from "react";
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
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

export function CaseCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: templates } = useQuery({
    queryKey: ["case-templates"],
    queryFn: () => api.listTemplates(),
  });

  const { data: usersData } = useQuery({
    queryKey: ["organization-users"],
    queryFn: () => listOrganizationUsers(),
  });

  const [templateId, setTemplateId] = useState("");
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

  const createMutation = useMutation({
    mutationFn: (payload: api.CreateCasePayload) => api.createCase(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.push(`/cases/${data.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const selectedTemplate = templates?.find((t) => t.id === templateId);

  const assigneeOptions = useMemo(
    () =>
      (usersData?.users ?? []).map((u) => ({
        id: u.id,
        label: u.name?.trim() || u.email,
      })),
    [usersData?.users],
  );

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
    createMutation.mutate({
      templateId: templateId || undefined,
      description: description.trim() || undefined,
      priority,
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      dueDate: dueDate || undefined,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      customerId: customerId.trim() || undefined,
      orderGiverId: orderGiverId.trim() || undefined,
      interventionSiteId: interventionSiteId || undefined,
    });
  };

  return (
    <FormPage
      title="Nouveau dossier"
      description="Créez un dossier, optionnellement basé sur un modèle existant. Un numéro est attribué automatiquement."
      breadcrumb={{ href: "/cases", label: "Dossiers" }}
      error={error || undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton
            onClick={() => router.push("/cases")}
            disabled={createMutation.isPending}
          />
          <FormDialogPrimaryButton type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Création…" : "Créer le dossier"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {templates && templates.length > 0 ? (
        <FormDialogSection title="Modèle" id="case-create-template">
          <div>
            <label htmlFor="case-create-template-select" className={formFieldLabelClassName}>
              Modèle de dossier (optionnel)
            </label>
            <select
              id="case-create-template-select"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={formFieldInputClassName}
              disabled={createMutation.isPending}
            >
              <option value="">Sans modèle (dossier vierge)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.steps.length} étapes)
                </option>
              ))}
            </select>
            {selectedTemplate ? (
              <p className={formFieldHintClassName}>
                Ce dossier contiendra {selectedTemplate.steps.length} étape(s) et{" "}
                {selectedTemplate.steps.reduce((a, s) => a + s.todos.length, 0)} tâche(s)
                prédéfinies.
              </p>
            ) : null}
          </div>
        </FormDialogSection>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <FormDialogSection title="Dossier" id="case-create-details">
          <div>
            <label htmlFor="case-create-description" className={formFieldLabelClassName}>
              Description
            </label>
            <textarea
              id="case-create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={formFieldInputClassName}
              placeholder="Description du dossier…"
              disabled={createMutation.isPending}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="case-create-priority" className={formFieldLabelClassName}>
                Priorité
              </label>
              <select
                id="case-create-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as CasePriority)}
                className={formFieldInputClassName}
                disabled={createMutation.isPending}
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label htmlFor="case-create-due-date" className={formFieldLabelClassName}>
                Échéance
              </label>
              <input
                id="case-create-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={formFieldInputClassName}
                disabled={createMutation.isPending}
              />
            </div>
          </div>

          <div>
            <label htmlFor="case-create-tags" className={formFieldLabelClassName}>
              Tags
            </label>
            <input
              id="case-create-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className={formFieldInputClassName}
              placeholder="ceed, audit, rénovation…"
              disabled={createMutation.isPending}
            />
            <p className={formFieldHintClassName}>Séparez les tags par des virgules.</p>
          </div>
        </FormDialogSection>

        <FormDialogSection title="Parties prenantes" id="case-create-parties">
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
            idPrefix="case-create-customer"
            value={customerId}
            onChange={handleCustomerChange}
            disabled={createMutation.isPending}
          />

          <CaseOrderGiverPicker
            idPrefix="case-create-order-giver"
            value={orderGiverId}
            onChange={setOrderGiverId}
            disabled={createMutation.isPending}
          />

          {customerId && customerSites.length > 0 ? (
            <CaseInterventionSitePicker
              sites={customerSites}
              value={interventionSiteId}
              onChange={setInterventionSiteId}
              disabled={createMutation.isPending}
            />
          ) : null}
        </FormDialogSection>
      </div>
    </FormPage>
  );
}
