"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommentEntityType, CommentResponse } from "@planwise/shared";
import { MAX_COMMENT_BODY_LENGTH } from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import * as api from "@/lib/cases.api";

function formatCommentDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CommentsSectionProps {
  entityType: CommentEntityType;
  entityId: string;
  /** Pour invalider l'historique du dossier après un commentaire sur une intervention. */
  caseId?: string;
  /** Titre de section ; défaut selon entityType. */
  title?: string;
  /** Mode compact pour My Day / cartes intervention. */
  compact?: boolean;
  /** Déplié par défaut (utile en mode compact). */
  defaultOpen?: boolean;
}

export function CommentsSection({
  entityType,
  entityId,
  caseId,
  title,
  compact = false,
  defaultOpen = !compact,
}: CommentsSectionProps) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [open, setOpen] = useState(defaultOpen);

  const canRead = can("comments.read");
  const queryKey = ["comments", entityType, entityId] as const;

  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => api.listComments(entityType, entityId),
    enabled: canRead && !!entityId,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
    const historyCaseId = entityType === "case" ? entityId : caseId;
    if (historyCaseId) {
      void queryClient.invalidateQueries({ queryKey: ["case-history", historyCaseId] });
    }
  };

  const createMutation = useMutation({
    mutationFn: (body: string) => api.createComment({ entityType, entityId, body }),
    onSuccess: () => {
      setDraft("");
      invalidate();
      showToast("Commentaire publié", "success");
    },
    onError: (err: Error) => showToast(err.message || "Erreur", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.updateComment(id, body),
    onSuccess: () => {
      setEditingId(null);
      setEditDraft("");
      invalidate();
      showToast("Commentaire modifié", "success");
    },
    onError: (err: Error) => showToast(err.message || "Erreur", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteComment(id),
    onSuccess: () => {
      invalidate();
      showToast("Commentaire supprimé", "success");
    },
    onError: (err: Error) => showToast(err.message || "Erreur", "error"),
  });

  if (!canRead) return null;

  const sectionTitle =
    title ?? (entityType === "case" ? "Commentaires" : "Commentaires intervention");

  const canEditComment = (comment: CommentResponse) =>
    can("comments.update") && (user?.role === "admin" || comment.authorId === user?.id);

  const canDeleteComment = (comment: CommentResponse) =>
    can("comments.delete") && (user?.role === "admin" || comment.authorId === user?.id);

  const submitCreate = () => {
    const body = draft.trim();
    if (!body) return;
    createMutation.mutate(body);
  };

  const startEdit = (comment: CommentResponse) => {
    setEditingId(comment.id);
    setEditDraft(comment.body);
  };

  const submitEdit = () => {
    if (!editingId) return;
    const body = editDraft.trim();
    if (!body) return;
    updateMutation.mutate({ id: editingId, body });
  };

  const handleDelete = async (comment: CommentResponse) => {
    const ok = await confirm({
      title: "Supprimer le commentaire ?",
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (ok) deleteMutation.mutate(comment.id);
  };

  const body = (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {isLoading ? (
        <p className="text-xs text-slate-400">Chargement…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Aucun commentaire pour le moment.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                    {comment.authorName}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {formatCommentDate(comment.createdAt)}
                  </p>
                </div>
                {(canEditComment(comment) || canDeleteComment(comment)) &&
                  editingId !== comment.id && (
                    <div className="flex shrink-0 gap-1">
                      {canEditComment(comment) && (
                        <button
                          type="button"
                          onClick={() => startEdit(comment)}
                          className="text-[11px] text-slate-500 hover:text-brand-600 dark:hover:text-brand-400"
                        >
                          Modifier
                        </button>
                      )}
                      {canDeleteComment(comment) && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(comment)}
                          className="text-[11px] text-red-500 hover:text-red-600"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  )}
              </div>
              {editingId === comment.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={compact ? 2 : 3}
                    maxLength={MAX_COMMENT_BODY_LENGTH}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
                    aria-label="Modifier le commentaire"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={submitEdit}
                      disabled={updateMutation.isPending || !editDraft.trim()}
                      className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft("");
                      }}
                      className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1 text-xs text-slate-600 dark:text-slate-300"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                  {comment.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <PermissionGate permission="comments.create">
        <div className="space-y-2">
          <label className="sr-only" htmlFor={`comment-draft-${entityType}-${entityId}`}>
            Nouveau commentaire
          </label>
          <textarea
            id={`comment-draft-${entityType}-${entityId}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={compact ? 2 : 3}
            maxLength={MAX_COMMENT_BODY_LENGTH}
            placeholder="Écrire un commentaire…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              {draft.length}/{MAX_COMMENT_BODY_LENGTH}
            </span>
            <button
              type="button"
              onClick={submitCreate}
              disabled={createMutation.isPending || !draft.trim()}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              {createMutation.isPending ? "Publication…" : "Publier"}
            </button>
          </div>
        </div>
      </PermissionGate>
    </div>
  );

  if (compact) {
    return (
      <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left text-xs font-medium text-slate-700 dark:text-slate-200"
          aria-expanded={open}
        >
          <span>
            {sectionTitle}
            {comments.length > 0 ? ` (${comments.length})` : ""}
          </span>
          <span aria-hidden className="text-slate-400">
            {open ? "▾" : "▸"}
          </span>
        </button>
        {open && <div className="mt-2">{body}</div>}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        {sectionTitle}
        {comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20">
        {body}
      </div>
    </section>
  );
}
