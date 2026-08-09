"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { PlatformEmailTemplate } from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const PLACEHOLDER_HELP =
  "Placeholders : {{greeting}}, {{contactName}}, {{companyName}}, {{landingUrl}}. Gras : **texte**.";

const EMPTY_FORM = {
  name: "",
  subject: "",
  body: "",
  footer: "",
  ctaLabel: "Découvrir Planwise",
  ctaUrl: "/",
  isDefault: false,
};

export function PlatformEmailTemplatesPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<PlatformEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi.listPlatformEmailTemplates("prospect_outreach");
      setTemplates(res.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPreviewHtml(null);
    setPreviewSubject(null);
  };

  const startEdit = (tpl: PlatformEmailTemplate) => {
    setEditingId(tpl.id);
    setForm({
      name: tpl.name,
      subject: tpl.subject,
      body: tpl.body,
      footer: tpl.footer,
      ctaLabel: tpl.ctaLabel,
      ctaUrl: tpl.ctaUrl,
      isDefault: tpl.isDefault,
    });
    setPreviewHtml(null);
    setPreviewSubject(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await platformApi.updatePlatformEmailTemplate(editingId, {
          name: form.name,
          subject: form.subject,
          body: form.body,
          footer: form.footer,
          ctaLabel: form.ctaLabel,
          ctaUrl: form.ctaUrl,
          isDefault: form.isDefault || undefined,
        });
        showToast("Contenu mis à jour.", "success");
      } else {
        await platformApi.createPlatformEmailTemplate({
          name: form.name,
          purpose: "prospect_outreach",
          subject: form.subject,
          body: form.body,
          footer: form.footer,
          ctaLabel: form.ctaLabel,
          ctaUrl: form.ctaUrl,
          isDefault: form.isDefault,
        });
        showToast("Contenu créé.", "success");
      }
      await load();
      startCreate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Enregistrement impossible", "error");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (tpl: PlatformEmailTemplate) => {
    const ok = await confirm({
      title: "Supprimer ce contenu ?",
      description: `« ${tpl.name} » sera définitivement supprimé.`,
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    try {
      await platformApi.deletePlatformEmailTemplate(tpl.id);
      showToast("Contenu supprimé.", "success");
      if (editingId === tpl.id) startCreate();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Suppression impossible", "error");
    }
  };

  const onSetDefault = async (tpl: PlatformEmailTemplate) => {
    try {
      await platformApi.setDefaultPlatformEmailTemplate(tpl.id);
      showToast("Contenu défini par défaut.", "success");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action impossible", "error");
    }
  };

  const onPreview = async () => {
    setPreviewing(true);
    try {
      const res = await platformApi.previewPlatformEmailTemplate({
        subject: form.subject,
        body: form.body,
        footer: form.footer,
        ctaLabel: form.ctaLabel,
        ctaUrl: form.ctaUrl,
        contactName: "Jean Dupont",
        companyName: "Entreprise exemple",
      });
      setPreviewHtml(res.html);
      setPreviewSubject(res.subject);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Aperçu impossible", "error");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Contenus e-mail
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gérez les textes envoyés depuis la prospection. Choisissez le contenu au moment de
          l’envoi.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Prospection ({templates.length})
            </h2>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Nouveau
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun contenu.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {templates.map((tpl) => (
                <li key={tpl.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {tpl.name}
                      {tpl.isDefault ? (
                        <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                          Défaut
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{tpl.subject}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(tpl)}
                      className="rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
                    >
                      Éditer
                    </button>
                    {!tpl.isDefault ? (
                      <button
                        type="button"
                        onClick={() => void onSetDefault(tpl)}
                        className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Défaut
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void onDelete(tpl)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      Suppr.
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {editingId ? "Modifier le contenu" : "Nouveau contenu"}
          </h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Nom
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Sujet
              <input
                required
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Corps
              <textarea
                required
                rows={12}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-950"
              />
            </label>
            <p className="text-[11px] text-slate-500">{PLACEHOLDER_HELP}</p>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Pied de page
              <textarea
                rows={2}
                value={form.footer}
                onChange={(e) => setForm((f) => ({ ...f, footer: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Libellé CTA
                <input
                  value={form.ctaLabel}
                  onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                URL CTA
                <input
                  value={form.ctaUrl}
                  onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              Contenu par défaut (présélectionné à l’envoi)
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => void onPreview()}
                disabled={previewing || !form.subject.trim()}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {previewing ? "Aperçu…" : "Aperçu"}
              </button>
            </div>
          </form>
        </section>
      </div>

      {previewHtml ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Aperçu{previewSubject ? ` — ${previewSubject}` : ""}
          </h2>
          <iframe
            title="Aperçu e-mail"
            sandbox=""
            srcDoc={previewHtml}
            className="h-[480px] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700"
          />
        </section>
      ) : null}
    </div>
  );
}
