"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  interpolateEmailTemplatePlaceholders,
  isPlatformUserActive,
  type PlatformEmailTemplate,
  type PlatformUserSummary,
} from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { buildSupportSessionHandoffUrl } from "@/lib/support-session";
import { ListPagination, LIST_PAGE_SIZE } from "@/components/ui/list-page";

const ACTIVE_REFRESH_MS = 60_000;
const APP_LANDING_URL = "https://app.planwise.fr";

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function applyTemplateToFields(
  tpl: PlatformEmailTemplate,
  user: PlatformUserSummary,
): { subject: string; body: string; footer: string; ctaLabel: string; ctaUrl: string } {
  const placeholders = {
    contactName: user.name?.trim() || undefined,
    companyName: user.organizationName?.trim() || undefined,
    landingUrl: APP_LANDING_URL,
  };
  return {
    subject: interpolateEmailTemplatePlaceholders(tpl.subject, placeholders),
    body: interpolateEmailTemplatePlaceholders(tpl.body, placeholders),
    footer: interpolateEmailTemplatePlaceholders(tpl.footer, placeholders),
    ctaLabel: tpl.ctaLabel,
    ctaUrl: tpl.ctaUrl,
  };
}

export function PlatformUsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<PlatformUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [reasonByUser, setReasonByUser] = useState<Record<string, string>>({});
  const [emailTarget, setEmailTarget] = useState<PlatformUserSummary | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<PlatformEmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailFooter, setEmailFooter] = useState("");
  const [emailCtaLabel, setEmailCtaLabel] = useState("Ouvrir Planwise");
  const [emailCtaUrl, setEmailCtaUrl] = useState("/");
  const [emailReason, setEmailReason] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailPreviewing, setEmailPreviewing] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string | null>(null);
  const [emailPreviewSubject, setEmailPreviewSubject] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [query, activeOnly]);

  useEffect(() => {
    const id = window.setInterval(() => setRefreshTick((n) => n + 1), ACTIVE_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    platformApi
      .listPlatformUsers({
        search: query || undefined,
        activeOnly: activeOnly || undefined,
        limit: LIST_PAGE_SIZE,
        offset,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.users);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, offset, activeOnly, refreshTick]);

  const loadEmailTemplates = useCallback(async () => {
    try {
      const res = await platformApi.listPlatformEmailTemplates("user_support");
      setEmailTemplates(res.templates);
      return res.templates;
    } catch {
      setEmailTemplates([]);
      return [] as PlatformEmailTemplate[];
    }
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  const impersonate = async (user: PlatformUserSummary) => {
    if (!user.organizationId) {
      setError("Cet utilisateur n’a pas d’organisation active.");
      return;
    }
    const reason = (reasonByUser[user.id] ?? "").trim();
    if (reason.length < 10) {
      setError("Indiquez un motif support d’au moins 10 caractères.");
      return;
    }
    setImpersonatingId(user.id);
    setError(null);
    try {
      const result = await platformApi.startImpersonation({
        userId: user.id,
        organizationId: user.organizationId,
        reason,
      });
      window.location.href = buildSupportSessionHandoffUrl(result.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impersonation impossible");
      setImpersonatingId(null);
    }
  };

  const openEmail = async (user: PlatformUserSummary) => {
    setEmailTarget(user);
    setEmailReason("");
    setEmailSuccess(null);
    setEmailPreviewHtml(null);
    setEmailPreviewSubject(null);
    setError(null);
    const templates = await loadEmailTemplates();
    const defaultTpl = templates.find((t) => t.isDefault) ?? templates[0];
    if (defaultTpl) {
      setSelectedTemplateId(defaultTpl.id);
      const fields = applyTemplateToFields(defaultTpl, user);
      setEmailSubject(fields.subject);
      setEmailBody(fields.body);
      setEmailFooter(fields.footer);
      setEmailCtaLabel(fields.ctaLabel);
      setEmailCtaUrl(fields.ctaUrl);
    } else {
      setSelectedTemplateId("");
      setEmailSubject("");
      setEmailBody("");
      setEmailFooter(
        "Cet e-mail vous a été envoyé par l’équipe Planwise. Pour toute question, répondez à cet e-mail ou contactez le support.",
      );
      setEmailCtaLabel("Ouvrir Planwise");
      setEmailCtaUrl("/");
    }
  };

  const onSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setEmailPreviewHtml(null);
    setEmailPreviewSubject(null);
    if (!emailTarget || !templateId) return;
    const tpl = emailTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const fields = applyTemplateToFields(tpl, emailTarget);
    setEmailSubject(fields.subject);
    setEmailBody(fields.body);
    setEmailFooter(fields.footer);
    setEmailCtaLabel(fields.ctaLabel);
    setEmailCtaUrl(fields.ctaUrl);
  };

  const closeEmail = () => {
    if (emailSending || emailPreviewing) return;
    setEmailTarget(null);
    setEmailPreviewHtml(null);
  };

  const previewEmail = async () => {
    if (!emailTarget) return;
    setEmailPreviewing(true);
    setError(null);
    try {
      const res = await platformApi.previewPlatformEmailTemplate({
        subject: emailSubject.trim(),
        body: emailBody.trim(),
        footer: emailFooter.trim(),
        ctaLabel: emailCtaLabel.trim(),
        ctaUrl: emailCtaUrl.trim() || "/",
        contactName: emailTarget.name?.trim() || undefined,
        companyName: emailTarget.organizationName?.trim() || undefined,
      });
      setEmailPreviewHtml(res.html);
      setEmailPreviewSubject(res.subject);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aperçu impossible");
    } finally {
      setEmailPreviewing(false);
    }
  };

  const sendEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailTarget) return;
    setEmailSending(true);
    setError(null);
    setEmailSuccess(null);
    try {
      const result = await platformApi.sendPlatformUserEmail(emailTarget.id, {
        subject: emailSubject.trim(),
        body: emailBody.trim(),
        reason: emailReason.trim(),
        ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
        footer: emailFooter.trim() || undefined,
        ctaLabel: emailCtaLabel.trim() || undefined,
        ctaUrl: emailCtaUrl.trim() || undefined,
      });
      if (!result.sent) {
        setError(
          result.reason
            ? `E-mail non envoyé : ${result.reason}`
            : "E-mail non envoyé (SMTP indisponible).",
        );
        return;
      }
      setEmailSuccess(`E-mail envoyé à ${result.to}`);
      setEmailTarget(null);
      setEmailPreviewHtml(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Utilisateurs</h1>
          <p className="text-sm text-slate-500">
            {total} utilisateur(s)
            {activeOnly ? " en activité" : ""}
            <span className="text-slate-400"> · actualisation ~1 min</span>
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-slate-300"
            />
            En activité seulement
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email ou nom…"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Filtrer
          </button>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {emailSuccess ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{emailSuccess}</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : (
        <ul className="space-y-3">
          {items.map((user) => {
            const active = isPlatformUserActive(user.lastSeenAt);
            return (
              <li
                key={user.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                      {user.name || user.email}
                      {active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                          En activité
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-slate-500">
                      {user.email}
                      {user.organizationName ? (
                        <>
                          {" · "}
                          <Link
                            href={`/platform/organizations/${user.organizationId}`}
                            className="text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {user.organizationName}
                          </Link>
                        </>
                      ) : null}
                      {user.role ? ` · ${user.role}` : null}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Dernière connexion : {formatDate(user.lastLoginAt)}
                      {" · "}
                      Dernière activité : {formatDate(user.lastSeenAt)}
                    </p>
                  </div>
                  <div className="flex w-full max-w-md flex-col gap-2 sm:items-end">
                    <button
                      type="button"
                      onClick={() => void openEmail(user)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      Envoyer un e-mail
                    </button>
                    {user.organizationId ? (
                      <>
                        <input
                          value={reasonByUser[user.id] ?? ""}
                          onChange={(e) =>
                            setReasonByUser((prev) => ({ ...prev, [user.id]: e.target.value }))
                          }
                          placeholder="Motif support (ticket…)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                        />
                        <button
                          type="button"
                          disabled={impersonatingId === user.id}
                          onClick={() => void impersonate(user)}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
                        >
                          {impersonatingId === user.id ? "Ouverture…" : "Se connecter en support"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
          {items.length === 0 ? (
            <li className="py-8 text-center text-sm text-slate-500">Aucun utilisateur</li>
          ) : null}
        </ul>
      )}
      {!loading && total > 0 ? (
        <ListPagination
          offset={offset}
          limit={LIST_PAGE_SIZE}
          total={total}
          onOffsetChange={setOffset}
        />
      ) : null}

      {emailTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="platform-email-title"
          onClick={closeEmail}
        >
          <form
            onSubmit={(e) => void sendEmail(e)}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <h2
              id="platform-email-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              E-mail à {emailTarget.name || emailTarget.email}
            </h2>
            <p className="text-sm text-slate-500">{emailTarget.email}</p>

            <label className="block space-y-1 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Modèle</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => onSelectTemplate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                {emailTemplates.length === 0 ? (
                  <option value="">Aucun modèle — saisie libre</option>
                ) : (
                  emailTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.isDefault ? " (défaut)" : ""}
                    </option>
                  ))
                )}
              </select>
              <span className="text-xs text-slate-400">
                Gérés dans Contenus e-mail → Support utilisateurs. Vous pouvez encore modifier le
                texte avant envoi.
              </span>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Objet</span>
              <input
                value={emailSubject}
                onChange={(e) => {
                  setEmailSubject(e.target.value);
                  setEmailPreviewHtml(null);
                }}
                required
                minLength={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Message</span>
              <textarea
                value={emailBody}
                onChange={(e) => {
                  setEmailBody(e.target.value);
                  setEmailPreviewHtml(null);
                }}
                required
                minLength={10}
                rows={6}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Motif support (interne)</span>
              <input
                value={emailReason}
                onChange={(e) => setEmailReason(e.target.value)}
                required
                minLength={10}
                placeholder="Ex. Ticket #123 — relance essai"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            {emailPreviewHtml ? (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Aperçu{emailPreviewSubject ? ` — ${emailPreviewSubject}` : ""}
                </p>
                <iframe
                  title="Aperçu e-mail support"
                  sandbox=""
                  srcDoc={emailPreviewHtml}
                  className="h-[320px] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeEmail}
                disabled={emailSending || emailPreviewing}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void previewEmail()}
                disabled={emailSending || emailPreviewing || emailSubject.trim().length < 3}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {emailPreviewing ? "Aperçu…" : "Aperçu"}
              </button>
              <button
                type="submit"
                disabled={emailSending || emailPreviewing}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
              >
                {emailSending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
