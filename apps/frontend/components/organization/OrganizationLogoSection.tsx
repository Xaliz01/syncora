"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useOrganization } from "@/lib/organization";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { hasPermission } from "@/lib/auth-permissions";
import * as organizationsApi from "@/lib/organizations.api";
import * as documentsApi from "@/lib/documents.api";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export function OrganizationLogoSection() {
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const canUpdate = hasPermission(user, "organizations.update");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const logoDocumentId = activeOrganization?.logoDocumentId;

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    if (!logoDocumentId) {
      setPreviewUrl(null);
      return;
    }

    setLoadingPreview(true);
    void documentsApi
      .fetchDocumentPreviewUrl(logoDocumentId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        revoked = url;
        setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [logoDocumentId]);

  const invalidateOrg = () => {
    void queryClient.invalidateQueries({ queryKey: ["organizations", "mine"] });
    void queryClient.invalidateQueries({
      queryKey: ["organizations", "mine", user?.organizationId],
    });
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.organizationId) throw new Error("Organisation introuvable");
      if (!ACCEPTED_TYPES.includes(file.type)) {
        throw new Error("Formats acceptés : PNG, JPEG ou WebP.");
      }
      if (file.size > MAX_SIZE_BYTES) {
        throw new Error("Le logo ne doit pas dépasser 2 Mo.");
      }
      const previousId = logoDocumentId;
      const doc = await documentsApi.uploadDocument("organization", user.organizationId, file);
      await organizationsApi.updateMine({ logoDocumentId: doc.id });
      if (previousId && previousId !== doc.id) {
        await documentsApi.deleteDocument(previousId).catch(() => undefined);
      }
    },
    onSuccess: () => {
      showToast("Logo enregistré.");
      invalidateOrg();
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const previousId = logoDocumentId;
      await organizationsApi.updateMine({ logoDocumentId: null });
      if (previousId) {
        await documentsApi.deleteDocument(previousId).catch(() => undefined);
      }
    },
    onSuccess: () => {
      showToast("Logo retiré.");
      invalidateOrg();
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const busy = uploadMutation.isPending || removeMutation.isPending;

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Logo</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          PDF. PNG, JPEG ou WebP — 2 Mo max.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-40 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 overflow-hidden">
          {loadingPreview ? (
            <span className="text-xs text-slate-400">Chargement…</span>
          ) : previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Logo de l’organisation"
              className="max-h-full max-w-full object-contain p-2"
            />
          ) : (
            <span className="text-xs text-slate-400 px-2 text-center">Aucun logo</span>
          )}
        </div>

        {canUpdate && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) uploadMutation.mutate(file);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {uploadMutation.isPending
                ? "Envoi…"
                : logoDocumentId
                  ? "Remplacer"
                  : "Ajouter un logo"}
            </button>
            {logoDocumentId && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await confirm({
                    title: "Retirer le logo ?",
                    description: "Les devis générés n’afficheront plus ce logo.",
                    confirmLabel: "Retirer",
                    variant: "danger",
                  });
                  if (ok) removeMutation.mutate();
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {removeMutation.isPending ? "…" : "Retirer"}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
