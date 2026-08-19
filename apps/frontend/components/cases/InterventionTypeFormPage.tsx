"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import { normalizeCalendarColorHex } from "@/lib/team-calendar-colors";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

const LIST_HREF = "/settings/intervention-types";
const DEFAULT_COLOR = "#64748b";

export function InterventionTypeFormPage({ typeId }: { typeId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(typeId);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["intervention-type", typeId],
    queryFn: () => api.getInterventionType(typeId!),
    enabled: isEdit,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setDescription(existing.description ?? "");
    setColor(normalizeCalendarColorHex(existing.color) ?? DEFAULT_COLOR);
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: (payload: api.CreateInterventionTypePayload) => api.createInterventionType(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intervention-types"] });
      showToast("Type d’intervention créé", "success");
      router.push(LIST_HREF);
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: api.UpdateInterventionTypePayload) =>
      api.updateInterventionType(typeId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intervention-types"] });
      void queryClient.invalidateQueries({ queryKey: ["intervention-type", typeId] });
      showToast("Type d’intervention mis à jour", "success");
      router.push(LIST_HREF);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color: normalizeCalendarColorHex(color) ?? DEFAULT_COLOR,
    };
    if (isEdit) updateMutation.mutate(payload);
    else
      createMutation.mutate({
        name: payload.name,
        description: description.trim() || undefined,
        color: payload.color,
      });
  };

  const pending = createMutation.isPending || updateMutation.isPending;
  const colorValue = normalizeCalendarColorHex(color) ?? DEFAULT_COLOR;

  return (
    <FormPage
      title={isEdit ? "Modifier le type" : "Nouveau type d’intervention"}
      description="Type proposé à la création d’une intervention (couleur au planning)."
      breadcrumb={{ href: LIST_HREF, label: "Types d’intervention" }}
      error={error || undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton onClick={() => router.push(LIST_HREF)} disabled={pending} />
          <FormDialogPrimaryButton type="submit" disabled={pending || (isEdit && isLoading)}>
            {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le type"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {isEdit && isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : (
        <FormDialogSection title="Type">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={formFieldLabelClassName}>
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Pose, SAV…"
                required
                className={formFieldInputClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={formFieldLabelClassName}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionnel"
                rows={2}
                className={formFieldInputClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={formFieldLabelClassName}>Couleur</label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  aria-label="Couleur du type"
                  className="h-10 w-14 cursor-pointer rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  value={colorValue}
                  onChange={(e) => setColor(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="#RRGGBB"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className={`${formFieldInputClassName} mt-0 min-w-[120px] flex-1 font-mono`}
                />
              </div>
            </div>
          </div>
        </FormDialogSection>
      )}
    </FormPage>
  );
}
