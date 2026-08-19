"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/stock.api";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

const LIST_HREF = "/settings/stock/articles";

export function ArticleFormPage({ articleId }: { articleId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(articleId);
  const detailHref = articleId ? `${LIST_HREF}/${articleId}` : LIST_HREF;

  const { data: existing, isLoading } = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => api.getArticle(articleId!),
    enabled: isEdit,
  });

  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("unité");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [initialStock, setInitialStock] = useState("0");
  const [reorderPoint, setReorderPoint] = useState("0");
  const [targetStock, setTargetStock] = useState("0");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setReference(existing.reference);
    setDescription(existing.description ?? "");
    setUnit(existing.unit);
    setDefaultPrice(existing.defaultPrice !== undefined ? String(existing.defaultPrice) : "");
    setReorderPoint(String(existing.reorderPoint));
    setTargetStock(String(existing.targetStock));
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: (payload: api.CreateArticlePayload) => api.createArticle(payload),
    onSuccess: (article) => {
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
      void queryClient.invalidateQueries({ queryKey: ["article-movements"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      showToast("Article créé avec succès.");
      router.push(`${LIST_HREF}/${article.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: api.UpdateArticlePayload) => api.updateArticle(articleId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["article", articleId] });
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
      showToast("Article mis à jour.");
      router.push(detailHref);
    },
    onError: (err: Error) => setError(err.message),
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim() || !reference.trim()) {
      setError("Le nom et la référence sont obligatoires");
      return;
    }
    const reorder = Number(reorderPoint || 0);
    const target = Number(targetStock || 0);
    if (!Number.isFinite(reorder) || reorder < 0) {
      setError("Seuil invalide.");
      return;
    }
    if (!Number.isFinite(target) || target < 0) {
      setError("Stock cible invalide.");
      return;
    }

    if (isEdit) {
      const priceRaw = defaultPrice.trim();
      const price = priceRaw === "" ? null : Number(priceRaw);
      if (price !== null && !Number.isFinite(price)) {
        setError("Prix invalide.");
        return;
      }
      updateMutation.mutate({
        name: name.trim(),
        reference: reference.trim(),
        description: description.trim() || undefined,
        unit: unit.trim() || "unité",
        defaultPrice: price,
        reorderPoint: reorder,
        targetStock: target,
      });
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      reference: reference.trim(),
      unit: unit.trim() || "unité",
      defaultPrice: defaultPrice ? Number(defaultPrice) : undefined,
      initialStock: Number(initialStock || 0),
      reorderPoint: reorder,
      targetStock: target,
    });
  };

  return (
    <FormPage
      title={isEdit ? "Modifier l'article" : "Nouvel article"}
      description={
        isEdit
          ? "Mettez à jour les informations du catalogue et les seuils de stock."
          : "Ajoutez un article au catalogue pour le suivi de stock et les devis."
      }
      breadcrumb={{
        href: isEdit ? detailHref : LIST_HREF,
        label: isEdit ? name.trim() || existing?.name || "Fiche article" : "Catalogue articles",
      }}
      error={error || undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton
            onClick={() => router.push(isEdit ? detailHref : LIST_HREF)}
            disabled={pending}
          />
          <FormDialogPrimaryButton type="submit" disabled={pending || (isEdit && isLoading)}>
            {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer l'article"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {isEdit && isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : (
        <>
          <FormDialogSection title="Identification">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClassName}>
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Câble RJ45 Cat.6"
                  required
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>
                  Référence (SKU) <span className="text-red-500">*</span>
                </label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: CAB-RJ45-001"
                  required
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>Unité de mesure</label>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ex: mètre, unité, litre"
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>Prix par défaut (€ HT)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  placeholder="Optionnel"
                  className={formFieldInputClassName}
                />
                <p className={formFieldHintClassName}>Pré-rempli automatiquement sur les devis</p>
              </div>
              {isEdit ? (
                <div className="sm:col-span-2">
                  <label className={formFieldLabelClassName}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className={formFieldInputClassName}
                  />
                </div>
              ) : null}
            </div>
          </FormDialogSection>

          <FormDialogSection title="Stock">
            <div className={`grid gap-3 ${isEdit ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {!isEdit ? (
                <div>
                  <label className={formFieldLabelClassName}>Stock initial</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className={formFieldInputClassName}
                  />
                  <p className={formFieldHintClassName}>Quantité en stock au démarrage</p>
                </div>
              ) : null}
              <div>
                <label className={formFieldLabelClassName}>Seuil d&apos;alerte</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  className={formFieldInputClassName}
                />
                <p className={formFieldHintClassName}>Alerte quand le stock passe en dessous</p>
              </div>
              <div>
                <label className={formFieldLabelClassName}>Stock cible</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetStock}
                  onChange={(e) => setTargetStock(e.target.value)}
                  className={formFieldInputClassName}
                />
                <p className={formFieldHintClassName}>Niveau de stock optimal visé</p>
              </div>
            </div>
          </FormDialogSection>
        </>
      )}
    </FormPage>
  );
}

/** @deprecated use ArticleFormPage */
export const ArticleCreatePage = ArticleFormPage;
