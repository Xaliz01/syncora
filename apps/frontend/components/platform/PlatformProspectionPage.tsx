"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PLATFORM_PROSPECT_NAF_PRESETS, type PlatformProspectSummary } from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { ListPagination } from "@/components/ui/list-page";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const PER_PAGE = 20;

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

export function PlatformProspectionPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [preset, setPreset] = useState<string>("artisans_terrain");
  const [departement, setDepartement] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<PlatformProspectSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [creditsRemaining, setCreditsRemaining] = useState<number | undefined>();
  const [pappersConfigured, setPappersConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [sendingSiren, setSendingSiren] = useState<string | null>(null);

  const loadCredits = useCallback(() => {
    platformApi
      .getPlatformProspectCredits()
      .then((res) => {
        setPappersConfigured(res.configured);
        setCreditsRemaining(res.creditsRemaining);
      })
      .catch(() => undefined);
  }, []);

  const loadProspects = useCallback(() => {
    setLoading(true);
    platformApi
      .searchPlatformProspects({
        page,
        perPage: PER_PAGE,
        preset,
        departement: departement.trim() || undefined,
      })
      .then((res) => {
        setResults(res.results);
        setTotal(res.total);
        if (res.creditsRemaining != null) setCreditsRemaining(res.creditsRemaining);
        setError(null);
        setEmails((prev) => {
          const next = { ...prev };
          for (const r of res.results) {
            if (next[r.siren] === undefined) next[r.siren] = "";
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
  }, [page, preset, departement]);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    loadProspects();
  }, [loadProspects]);

  const onFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    // loadProspects via effect when page/preset/departement change; force if same page
    if (page === 1) loadProspects();
  };

  const sendOutreach = async (prospect: PlatformProspectSummary) => {
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
        contactName: prospect.dirigeants?.[0],
      });
      if (res.sent) {
        showToast("Invitation envoyée.", "success");
        setResults((rows) =>
          rows.map((r) =>
            r.siren === prospect.siren
              ? { ...r, alreadyContacted: true, lastContactedAt: new Date().toISOString() }
              : r,
          ),
        );
      } else {
        showToast(res.reason ?? "L’e-mail n’a pas pu être envoyé.", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur d’envoi", "error");
    } finally {
      setSendingSiren(null);
    }
  };

  const offset = (page - 1) * PER_PAGE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Prospection</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Entreprises françaises créées il y a moins d’un an (API Pappers), secteurs artisans / TPE.
          Saisissez un e-mail puis envoyez l’invitation beta Planwise.
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
              setPage(1);
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
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          Actualiser
        </button>
      </form>

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
              <th className="px-3 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Chargement…
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Aucun prospect pour ces critères.
                </td>
              </tr>
            ) : (
              results.map((p) => (
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
                    {p.alreadyContacted ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <button
                        type="button"
                        disabled={sendingSiren === p.siren}
                        onClick={() => void sendOutreach(p)}
                        className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                      >
                        {sendingSiren === p.siren ? "Envoi…" : "Inviter"}
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
        total={total}
        offset={offset}
        limit={PER_PAGE}
        onOffsetChange={(nextOffset) => setPage(Math.floor(nextOffset / PER_PAGE) + 1)}
      />
    </div>
  );
}
