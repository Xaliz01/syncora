"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  PLATFORM_PROSPECT_NAF_PRESETS,
  PROSPECT_OUTREACH_COMMENT_MAX_LENGTH,
  type PlatformProspectSearchSort,
  type PlatformProspectSummary,
  type ProspectOutreachResponse,
  type ProspectOutreachStatus,
} from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { ListPagination } from "@/components/ui/list-page";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const PER_PAGE = 20;
const TRACKED_PAGE_LIMIT = 50;

function defaultDateCreationMinIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 365);
  return d.toISOString().slice(0, 10);
}

const STATUS_LABELS: Record<ProspectOutreachStatus, string> = {
  sent: "Contacté",
  failed: "Échec envoi",
  email_not_found: "Email non trouvé",
  noted: "À contacter",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    // Pappers returns often YYYY-MM-DD
    const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
    return d.toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PlatformProspectionPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [preset, setPreset] = useState<string>("artisans_terrain");
  const [departement, setDepartement] = useState("");
  const [dateCreationMin, setDateCreationMin] = useState(defaultDateCreationMinIso);
  const [startPageInput, setStartPageInput] = useState("1");
  const [sort, setSort] = useState<PlatformProspectSearchSort>("created_at_desc");
  const [hideTreated, setHideTreated] = useState(true);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<PlatformProspectSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | undefined>();
  const [pappersConfigured, setPappersConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [sendingSiren, setSendingSiren] = useState<string | null>(null);
  const [markingSiren, setMarkingSiren] = useState<string | null>(null);
  const [savingCommentSiren, setSavingCommentSiren] = useState<string | null>(null);
  /** Filtres réellement envoyés à Pappers (null = pas encore de recherche). */
  const [activeQuery, setActiveQuery] = useState<{
    preset: string;
    departement: string;
    sort: PlatformProspectSearchSort;
    dateCreationMin: string;
  } | null>(null);
  const [searchNonce, setSearchNonce] = useState(0);
  const [forceRefresh, setForceRefresh] = useState(false);
  const refreshOnNextLoad = useRef(false);
  const [siretInput, setSiretInput] = useState("");
  const [isSiretLookup, setIsSiretLookup] = useState(false);

  const [tracked, setTracked] = useState<ProspectOutreachResponse[]>([]);
  const [trackedTotal, setTrackedTotal] = useState(0);
  const [trackedOffset, setTrackedOffset] = useState(0);
  const [trackedLoading, setTrackedLoading] = useState(true);
  const [trackedError, setTrackedError] = useState<string | null>(null);
  const [manualSiren, setManualSiren] = useState("");
  const [manualCompanyName, setManualCompanyName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualComment, setManualComment] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  const loadCredits = useCallback(() => {
    platformApi
      .getPlatformProspectCredits()
      .then((res) => {
        setPappersConfigured(res.configured);
        setCreditsRemaining(res.creditsRemaining);
      })
      .catch(() => undefined);
  }, []);

  const loadTracked = useCallback(() => {
    setTrackedLoading(true);
    platformApi
      .listPlatformTrackedProspects({ limit: TRACKED_PAGE_LIMIT, offset: trackedOffset })
      .then((res) => {
        setTracked(res.outreaches);
        setTrackedTotal(res.total);
        setTrackedError(null);
        setEmails((prev) => {
          const next = { ...prev };
          for (const o of res.outreaches) {
            if (next[o.siren] === undefined) next[o.siren] = o.email ?? "";
          }
          return next;
        });
        setComments((prev) => {
          const next = { ...prev };
          for (const o of res.outreaches) {
            next[o.siren] = o.comment ?? "";
          }
          return next;
        });
      })
      .catch((err) => {
        setTrackedError(err instanceof Error ? err.message : "Erreur");
        setTracked([]);
        setTrackedTotal(0);
      })
      .finally(() => setTrackedLoading(false));
  }, [trackedOffset]);

  const loadProspects = useCallback(() => {
    if (!activeQuery) return;
    setLoading(true);
    const refresh = refreshOnNextLoad.current;
    refreshOnNextLoad.current = false;
    platformApi
      .searchPlatformProspects({
        page,
        perPage: PER_PAGE,
        preset: activeQuery.preset,
        departement: activeQuery.departement || undefined,
        sort: activeQuery.sort,
        dateCreationMin: activeQuery.dateCreationMin,
        refresh,
      })
      .then((res) => {
        setResults(res.results);
        setTotal(res.total);
        setFromCache(Boolean(res.fromCache));
        if (res.creditsRemaining != null) setCreditsRemaining(res.creditsRemaining);
        setError(null);
        setEmails((prev) => {
          const next = { ...prev };
          for (const r of res.results) {
            if (next[r.siren] === undefined) next[r.siren] = "";
          }
          return next;
        });
        setComments((prev) => {
          const next = { ...prev };
          for (const r of res.results) {
            next[r.siren] = r.comment ?? "";
          }
          return next;
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erreur");
        setResults([]);
        setTotal(0);
        setFromCache(false);
      })
      .finally(() => setLoading(false));
  }, [page, activeQuery]);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    loadTracked();
  }, [loadTracked]);

  useEffect(() => {
    if (!activeQuery) return;
    loadProspects();
  }, [activeQuery, page, searchNonce, loadProspects]);

  const onFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedPage = Number.parseInt(startPageInput, 10);
    const nextPage = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    setStartPageInput(String(nextPage));
    setPage(nextPage);
    setIsSiretLookup(false);
    refreshOnNextLoad.current = forceRefresh;
    setActiveQuery({
      preset,
      departement: departement.trim(),
      sort,
      dateCreationMin: dateCreationMin.trim() || defaultDateCreationMinIso(),
    });
    setSearchNonce((n) => n + 1);
  };

  const onSiretLookup = (e: FormEvent) => {
    e.preventDefault();
    const id = siretInput.trim().replace(/\s/g, "");
    if (!/^\d{9}$/.test(id) && !/^\d{14}$/.test(id)) {
      showToast("Saisissez un SIRET (14 chiffres) ou un SIREN (9 chiffres).", "error");
      return;
    }
    setActiveQuery(null);
    setIsSiretLookup(true);
    setPage(1);
    setLoading(true);
    setError(null);
    platformApi
      .lookupPlatformProspectBySiret(id)
      .then((res) => {
        setResults(res.results);
        setTotal(res.total);
        setFromCache(false);
        if (res.creditsRemaining != null) setCreditsRemaining(res.creditsRemaining);
        setEmails((prev) => {
          const next = { ...prev };
          for (const r of res.results) {
            if (next[r.siren] === undefined) next[r.siren] = "";
          }
          return next;
        });
        setComments((prev) => {
          const next = { ...prev };
          for (const r of res.results) {
            next[r.siren] = r.comment ?? "";
          }
          return next;
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erreur");
        setResults([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  const sendOutreach = async (prospect: {
    siren: string;
    name: string;
    contactName?: string;
    postalCode?: string;
  }) => {
    const toEmail = (emails[prospect.siren] ?? "").trim();
    if (!toEmail.includes("@")) {
      showToast("Saisissez un e-mail valide avant d’envoyer.", "error");
      return;
    }
    const ok = await confirm({
      title: "Envoyer l’invitation ?",
      description: `Un e-mail Planwise beta sera envoyé à ${toEmail} pour « ${prospect.name} » (${prospect.siren}).`,
      confirmLabel: "Envoyer",
    });
    if (!ok) return;

    setSendingSiren(prospect.siren);
    try {
      const res = await platformApi.sendPlatformProspectOutreach({
        siren: prospect.siren,
        companyName: prospect.name,
        toEmail,
        contactName: prospect.contactName,
        postalCode: prospect.postalCode,
        force: true,
      });
      if (res.sent) {
        showToast("Invitation envoyée.", "success");
        setResults((rows) =>
          rows.map((r) =>
            r.siren === prospect.siren
              ? {
                  ...r,
                  alreadyContacted: true,
                  emailNotFound: false,
                  lastContactedAt: new Date().toISOString(),
                }
              : r,
          ),
        );
        loadTracked();
      } else {
        showToast(res.reason ?? "L’e-mail n’a pas pu être envoyé.", "error");
        loadTracked();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur d’envoi", "error");
    } finally {
      setSendingSiren(null);
    }
  };

  const markEmailNotFound = async (prospect: PlatformProspectSummary) => {
    const ok = await confirm({
      title: "Marquer « Email non trouvé » ?",
      description: `« ${prospect.name} » (${prospect.siren}) restera visible comme déjà recherché. Vous pourrez toujours envoyer une invitation plus tard si vous trouvez un e-mail.`,
      confirmLabel: "Marquer",
    });
    if (!ok) return;

    setMarkingSiren(prospect.siren);
    try {
      await platformApi.markPlatformProspectEmailNotFound({
        siren: prospect.siren,
        companyName: prospect.name,
      });
      showToast("Marqué : email non trouvé.", "success");
      setResults((rows) =>
        rows.map((r) =>
          r.siren === prospect.siren
            ? {
                ...r,
                emailNotFound: true,
                lastContactedAt: new Date().toISOString(),
              }
            : r,
        ),
      );
      loadTracked();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setMarkingSiren(null);
    }
  };

  const saveComment = async (prospect: { siren: string; name: string; comment?: string }) => {
    const comment = (comments[prospect.siren] ?? "").trim();
    setSavingCommentSiren(prospect.siren);
    try {
      const res = await platformApi.savePlatformProspectNote({
        siren: prospect.siren,
        companyName: prospect.name,
        comment,
      });
      showToast("Commentaire enregistré.", "success");
      setResults((rows) =>
        rows.map((r) =>
          r.siren === prospect.siren ? { ...r, comment: res.comment ?? (comment || undefined) } : r,
        ),
      );
      setComments((prev) => ({
        ...prev,
        [prospect.siren]: res.comment ?? comment,
      }));
      loadTracked();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setSavingCommentSiren(null);
    }
  };

  const onManualAdd = async (e: FormEvent) => {
    e.preventDefault();
    const companyName = manualCompanyName.trim();
    if (!companyName) {
      showToast("Indiquez le nom de l’entreprise.", "error");
      return;
    }
    setAddingManual(true);
    try {
      await platformApi.createPlatformManualProspect({
        siren: manualSiren,
        companyName,
        email: manualEmail.trim() || undefined,
        comment: manualComment.trim() || undefined,
      });
      showToast("Prospect ajouté.", "success");
      setManualSiren("");
      setManualCompanyName("");
      setManualEmail("");
      setManualComment("");
      if (trackedOffset !== 0) {
        setTrackedOffset(0);
      } else {
        loadTracked();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setAddingManual(false);
    }
  };

  const offset = (page - 1) * PER_PAGE;
  const visibleResults = hideTreated
    ? results.filter((r) => !r.alreadyContacted && !r.emailNotFound)
    : results;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Prospection</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Suivi des prospects déjà en base (sans crédit Pappers), puis recherche d’entreprises
          créées il y a moins d’un an (API Pappers).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm">
        {!pappersConfigured ? (
          <span className="text-amber-700 dark:text-amber-300">
            Clé Pappers non configurée (`PAPPERS_API_KEY` sur l’api-gateway).
          </span>
        ) : (
          <span className="text-slate-600 dark:text-slate-300">
            Crédits Pappers restants :{" "}
            <strong className="tabular-nums">
              {creditsRemaining != null ? creditsRemaining.toLocaleString("fr-FR") : "—"}
            </strong>
            <span className="text-slate-400 dark:text-slate-500">
              {" "}
              (~0,1 crédit / résultat de recherche)
            </span>
          </span>
        )}
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Prospects suivis
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Historique local (invitations, e-mails non trouvés, notes, ajouts manuels) — aucun appel
            Pappers.
          </p>
        </div>

        <form
          onSubmit={(e) => void onManualAdd(e)}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
        >
          <div className="min-w-[10rem]">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              SIREN ou SIRET
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={17}
              required
              placeholder="9 ou 14 chiffres"
              value={manualSiren}
              onChange={(e) => setManualSiren(e.target.value)}
              className="w-full max-w-[12rem] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
              disabled={addingManual}
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Nom de l’entreprise
            </label>
            <input
              type="text"
              required
              placeholder="Ex. Plomberie Dupont"
              value={manualCompanyName}
              onChange={(e) => setManualCompanyName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              disabled={addingManual}
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              E-mail (optionnel)
            </label>
            <input
              type="email"
              placeholder="contact@…"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              disabled={addingManual}
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Commentaire (optionnel)
            </label>
            <input
              type="text"
              maxLength={PROSPECT_OUTREACH_COMMENT_MAX_LENGTH}
              placeholder="Source, LinkedIn…"
              value={manualComment}
              onChange={(e) => setManualComment(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              disabled={addingManual}
            />
          </div>
          <button
            type="submit"
            disabled={addingManual}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {addingManual ? "Ajout…" : "Ajouter"}
          </button>
        </form>

        {trackedError ? <p className="text-sm text-red-600">{trackedError}</p> : null}

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5 font-medium">Entreprise</th>
                <th className="px-3 py-2.5 font-medium">SIREN</th>
                <th className="px-3 py-2.5 font-medium">Statut</th>
                <th className="px-3 py-2.5 font-medium">Mis à jour</th>
                <th className="px-3 py-2.5 font-medium min-w-[12rem]">E-mail</th>
                <th className="px-3 py-2.5 font-medium min-w-[12rem]">Commentaire</th>
                <th className="px-3 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {trackedLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              ) : tracked.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    Aucun prospect suivi. Ajoutez-en un ci-dessus ou lancez une recherche Pappers.
                  </td>
                </tr>
              ) : (
                tracked.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-2 align-middle max-w-[14rem]">
                      <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {o.companyName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{o.sentByEmail}</div>
                    </td>
                    <td className="px-3 py-2 align-middle tabular-nums text-slate-600 dark:text-slate-300">
                      {o.siren}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          o.status === "sent"
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                            : o.status === "email_not_found"
                              ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                              : o.status === "failed"
                                ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle tabular-nums text-slate-600 dark:text-slate-300">
                      {formatDateTime(o.sentAt)}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {o.status === "sent" ? (
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {o.email || "—"}
                        </span>
                      ) : (
                        <input
                          type="email"
                          value={emails[o.siren] ?? ""}
                          onChange={(e) =>
                            setEmails((prev) => ({ ...prev, [o.siren]: e.target.value }))
                          }
                          placeholder="contact@…"
                          className="w-full min-w-[10rem] rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col gap-1 min-w-[11rem]">
                        <textarea
                          value={comments[o.siren] ?? ""}
                          onChange={(e) =>
                            setComments((prev) => ({ ...prev, [o.siren]: e.target.value }))
                          }
                          maxLength={PROSPECT_OUTREACH_COMMENT_MAX_LENGTH}
                          rows={2}
                          placeholder="Note (site, LinkedIn…)"
                          className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs resize-y min-h-[2.5rem]"
                        />
                        <button
                          type="button"
                          disabled={
                            savingCommentSiren === o.siren ||
                            (comments[o.siren] ?? "") === (o.comment ?? "")
                          }
                          onClick={() =>
                            void saveComment({
                              siren: o.siren,
                              name: o.companyName,
                              comment: o.comment,
                            })
                          }
                          className="self-start rounded-md border border-slate-200 dark:border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                        >
                          {savingCommentSiren === o.siren ? "…" : "Enregistrer"}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {o.status === "sent" ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <button
                          type="button"
                          disabled={sendingSiren === o.siren || savingCommentSiren === o.siren}
                          onClick={() =>
                            void sendOutreach({
                              siren: o.siren,
                              name: o.companyName,
                            })
                          }
                          className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                        >
                          {sendingSiren === o.siren ? "Envoi…" : "Inviter"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ListPagination
          total={trackedTotal}
          offset={trackedOffset}
          limit={TRACKED_PAGE_LIMIT}
          onOffsetChange={setTrackedOffset}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Recherche Pappers
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Consomme des crédits. Recherchez une entreprise par SIRET, ou lancez une recherche par
            secteur.
          </p>
        </div>

        <form
          onSubmit={onSiretLookup}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
        >
          <div className="min-w-[14rem] flex-1">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Entreprise unique (SIRET ou SIREN)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={17}
              placeholder="14 ou 9 chiffres"
              value={siretInput}
              onChange={(e) => setSiretInput(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Chercher cette entreprise
          </button>
        </form>

        <form
          onSubmit={onFilterSubmit}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
        >
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Secteur</label>
            <select
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              {Object.values(PLATFORM_PROSPECT_NAF_PRESETS).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Département (optionnel)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              placeholder="ex. 75"
              value={departement}
              onChange={(e) => setDepartement(e.target.value)}
              className="w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Créée depuis
            </label>
            <input
              type="date"
              value={dateCreationMin}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDateCreationMin(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Page de départ
            </label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={startPageInput}
              onChange={(e) => setStartPageInput(e.target.value)}
              className="w-20 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Tri (page courante)
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as PlatformProspectSearchSort)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              title="Pappers ne propose pas de tri global : on trie uniquement la page renvoyée."
            >
              <option value="created_at_desc">Création ↓ (récentes d’abord)</option>
              <option value="default">Ordre Pappers</option>
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={hideTreated}
              onChange={(e) => setHideTreated(e.target.checked)}
              className="rounded border-slate-300"
            />
            Masquer déjà traités
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="rounded border-slate-300"
            />
            Ignorer le cache
          </label>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Rechercher
          </button>
        </form>

        {(activeQuery || isSiretLookup) && (
          <p className="text-xs text-slate-500">
            {isSiretLookup ? (
              <>Fiche unique (SIRET / SIREN)</>
            ) : (
              <>
                Page {page}
                {fromCache ? (
                  <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    Cache — 0 crédit
                  </span>
                ) : (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    Appel Pappers
                  </span>
                )}
                <span className="ml-2 text-slate-400">
                  (tri page locale ; pagination suivante utilise le cache si déjà vue)
                </span>
              </>
            )}
            {isSiretLookup ? (
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Appel Pappers
              </span>
            ) : null}
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5 font-medium">Entreprise</th>
                <th className="px-3 py-2.5 font-medium">SIREN</th>
                <th className="px-3 py-2.5 font-medium">NAF</th>
                <th className="px-3 py-2.5 font-medium">Créée le</th>
                <th className="px-3 py-2.5 font-medium">Ville</th>
                <th className="px-3 py-2.5 font-medium">Dirigeant</th>
                <th className="px-3 py-2.5 font-medium min-w-[12rem]">E-mail</th>
                <th className="px-3 py-2.5 font-medium min-w-[12rem]">Commentaire</th>
                <th className="px-3 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              ) : visibleResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    {activeQuery
                      ? hideTreated && results.length > 0
                        ? "Tous les résultats de cette page sont déjà traités (décochez le filtre pour les voir)."
                        : "Aucun prospect pour ces critères."
                      : isSiretLookup
                        ? hideTreated && results.length > 0
                          ? "Cette entreprise est déjà traitée (décochez le filtre pour la voir)."
                          : "Aucune entreprise trouvée pour ce SIRET / SIREN."
                        : "Choisissez vos filtres puis cliquez sur Rechercher (consomme des crédits Pappers)."}
                  </td>
                </tr>
              ) : (
                visibleResults.map((p) => (
                  <tr
                    key={p.siren}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-2 align-middle max-w-[14rem]">
                      <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {p.name}
                      </div>
                      {p.website && (
                        <a
                          href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline truncate block"
                        >
                          {p.website}
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle tabular-nums text-slate-600 dark:text-slate-300">
                      {p.siren}
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-600 dark:text-slate-300">
                      <span className="font-mono text-xs">{p.naf ?? "—"}</span>
                      {p.nafLabel && (
                        <span className="block text-[10px] text-slate-400 truncate max-w-[8rem]">
                          {p.nafLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle tabular-nums text-slate-600 dark:text-slate-300">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-600 dark:text-slate-300">
                      {[p.postalCode, p.city].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-600 dark:text-slate-300 max-w-[8rem] truncate">
                      {p.dirigeants?.[0] ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {p.alreadyContacted ? (
                        <span className="text-xs text-emerald-700 dark:text-emerald-300">
                          Déjà contacté
                          {p.lastContactedAt ? ` · ${formatDate(p.lastContactedAt)}` : ""}
                        </span>
                      ) : p.emailNotFound ? (
                        <div className="space-y-1.5">
                          <span className="block text-xs text-amber-700 dark:text-amber-300">
                            Email non trouvé
                            {p.lastContactedAt ? ` · ${formatDate(p.lastContactedAt)}` : ""}
                          </span>
                          <input
                            type="email"
                            value={emails[p.siren] ?? ""}
                            onChange={(e) =>
                              setEmails((prev) => ({ ...prev, [p.siren]: e.target.value }))
                            }
                            placeholder="trouvé plus tard…"
                            className="w-full min-w-[10rem] rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs"
                          />
                        </div>
                      ) : (
                        <input
                          type="email"
                          value={emails[p.siren] ?? ""}
                          onChange={(e) =>
                            setEmails((prev) => ({ ...prev, [p.siren]: e.target.value }))
                          }
                          placeholder="contact@…"
                          className="w-full min-w-[10rem] rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col gap-1 min-w-[11rem]">
                        <textarea
                          value={comments[p.siren] ?? ""}
                          onChange={(e) =>
                            setComments((prev) => ({ ...prev, [p.siren]: e.target.value }))
                          }
                          maxLength={PROSPECT_OUTREACH_COMMENT_MAX_LENGTH}
                          rows={2}
                          placeholder="Note (site, LinkedIn…)"
                          className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs resize-y min-h-[2.5rem]"
                        />
                        <button
                          type="button"
                          disabled={
                            savingCommentSiren === p.siren ||
                            (comments[p.siren] ?? "") === (p.comment ?? "")
                          }
                          onClick={() => void saveComment(p)}
                          className="self-start rounded-md border border-slate-200 dark:border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                        >
                          {savingCommentSiren === p.siren ? "…" : "Enregistrer"}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {p.alreadyContacted ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <div className="flex flex-col gap-1.5 items-stretch min-w-[7.5rem]">
                          <button
                            type="button"
                            disabled={
                              sendingSiren === p.siren ||
                              markingSiren === p.siren ||
                              savingCommentSiren === p.siren
                            }
                            onClick={() =>
                              void sendOutreach({
                                siren: p.siren,
                                name: p.name,
                                contactName: p.dirigeants?.[0],
                                postalCode: p.postalCode,
                              })
                            }
                            className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                          >
                            {sendingSiren === p.siren ? "Envoi…" : "Inviter"}
                          </button>
                          {!p.emailNotFound && (
                            <button
                              type="button"
                              disabled={
                                sendingSiren === p.siren ||
                                markingSiren === p.siren ||
                                savingCommentSiren === p.siren
                              }
                              onClick={() => void markEmailNotFound(p)}
                              className="rounded-md border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                            >
                              {markingSiren === p.siren ? "…" : "Email non trouvé"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isSiretLookup ? (
          <ListPagination
            total={total}
            offset={offset}
            limit={PER_PAGE}
            onOffsetChange={(nextOffset) => {
              const nextPage = Math.floor(nextOffset / PER_PAGE) + 1;
              setPage(nextPage);
              setStartPageInput(String(nextPage));
            }}
          />
        ) : null}
      </section>
    </div>
  );
}
