"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  DATA_IMPORT_ENTITIES,
  DATA_IMPORT_MAX_FILE_BYTES,
  DATA_IMPORT_MAX_ROWS,
  DATA_IMPORT_TARGET_FIELDS,
  type DataImportEntity,
  type DataImportRowError,
  type DataImportRunResponse,
  type DataImportRunSummary,
  type DataImportValidateResponse,
} from "@planwise/shared";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AssistantIcon } from "@/components/assistant/AssistantDrawer";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  DATA_IMPORT_ENTITY_META,
  listDataImportRuns,
  rollbackDataImportRun,
  runDataImport,
  suggestDataImportMapping,
  validateDataImport,
} from "@/lib/data-import.api";
import {
  applyMappingToRows,
  buildPlanwiseCsvParts,
  downloadTextFiles,
  parseFlexibleCsv,
} from "@/lib/data-import-convert";

const CARD =
  "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3";

const CONFIDENCE_FR: Record<"high" | "medium" | "low", string> = {
  high: "élevée",
  medium: "moyenne",
  low: "faible",
};

function ErrorsTable({ errors }: { errors: DataImportRowError[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 max-h-48">
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <tr>
            <th className="px-2 py-1.5 font-medium">Ligne</th>
            <th className="px-2 py-1.5 font-medium">Champ</th>
            <th className="px-2 py-1.5 font-medium">Sévérité</th>
            <th className="px-2 py-1.5 font-medium">Message</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((e, i) => (
            <tr
              key={`${e.row}-${e.field ?? ""}-${i}`}
              className="border-t border-slate-100 dark:border-slate-800"
            >
              <td className="px-2 py-1.5 tabular-nums">{e.row || "—"}</td>
              <td className="px-2 py-1.5 font-mono">{e.field ?? "—"}</td>
              <td className="px-2 py-1.5">
                {e.severity === "error" ? (
                  <span className="text-red-600 dark:text-red-400">erreur</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">warning</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200">{e.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function downloadErrorsCsv(entity: DataImportEntity, errors: DataImportRowError[]) {
  const lines = ["row;field;severity;message"];
  for (const e of errors) {
    const msg = e.message.replace(/"/g, '""');
    lines.push(`${e.row};${e.field ?? ""};${e.severity};"${msg}"`);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `import-${entity}-erreurs.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const MAPPING_STATUS_LINES = [
  "Lecture des colonnes de votre export…",
  "L’IA compare vos en-têtes aux champs Planwise…",
  "Proposition du mapping intelligent…",
];

const VALIDATE_STATUS_LINES = [
  "Lecture du fichier CSV…",
  "Vérification des colonnes et des lignes…",
  "Contrôle des identifiants et des liaisons…",
];

const IMPORT_STATUS_LINES = [
  "Envoi des lots vers Planwise…",
  "Création et mise à jour des fiches…",
  "Traitement en cours — les gros fichiers peuvent prendre une minute…",
];

function SoftProgressLoader({
  badge,
  title,
  statusLines,
  fileName,
  detail,
}: {
  badge: string;
  title: string;
  statusLines: string[];
  fileName?: string | null;
  detail?: string | null;
}) {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % statusLines.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [statusLines.length]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="rounded-xl border border-brand-200/80 dark:border-brand-500/30 bg-gradient-to-br from-brand-50 via-white to-slate-50 dark:from-brand-950/40 dark:via-slate-900 dark:to-slate-900 px-4 py-5"
    >
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-brand-200 dark:border-brand-500/40 border-t-brand-600 dark:border-t-brand-400 animate-spin" />
          <span className="relative text-[10px] font-bold tracking-wide text-brand-700 dark:text-brand-300">
            {badge}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
          <p key={statusIndex} className="text-xs text-slate-600 dark:text-slate-300">
            {statusLines[statusIndex]}
          </p>
          {(fileName || detail) && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {fileName ? <span className="font-medium">{fileName}</span> : null}
              {fileName && detail ? " · " : null}
              {detail}
            </p>
          )}
          <div className="pt-1 space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-2">
                <div
                  className="h-2.5 flex-1 max-w-[40%] rounded-full bg-slate-200/90 dark:bg-slate-700/80 animate-pulse"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
                <div
                  className="h-2.5 flex-1 max-w-[45%] rounded-full bg-brand-200/70 dark:bg-brand-500/20 animate-pulse"
                  style={{ animationDelay: `${i * 180}ms` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MappingAnalysisLoader({
  fileName,
  rowCount,
  columnCount,
}: {
  fileName?: string | null;
  rowCount?: number | null;
  columnCount?: number | null;
}) {
  const detailParts = [
    columnCount != null ? `${columnCount} colonne(s)` : null,
    rowCount != null ? `${rowCount} ligne(s)` : null,
  ].filter(Boolean);
  return (
    <SoftProgressLoader
      badge="IA"
      title="Mapping intelligent en cours"
      statusLines={MAPPING_STATUS_LINES}
      fileName={fileName}
      detail={detailParts.length > 0 ? detailParts.join(" · ") : null}
    />
  );
}

function ConvertExportOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [entity, setEntity] = useState<DataImportEntity>("customers");
  const [busy, setBusy] = useState(false);
  const [pendingMeta, setPendingMeta] = useState<{
    fileName?: string;
    rowCount: number;
    columnCount: number;
  } | null>(null);
  const [sourceHeaders, setSourceHeaders] = useState<string[]>([]);
  const [sourceRows, setSourceRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [notes, setNotes] = useState<string | null>(null);
  const [usedLlm, setUsedLlm] = useState(false);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(null);

  const targets = DATA_IMPORT_TARGET_FIELDS[entity];
  const mappedRequired = targets.filter((t) => t.required && mapping[t.key]).length;
  const requiredCount = targets.filter((t) => t.required).length;
  const showMapping = !busy && sourceHeaders.length > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const requestMapping = async (
    nextEntity: DataImportEntity,
    headers: string[],
    rows: Record<string, string>[],
  ) => {
    const suggestion = await suggestDataImportMapping({
      entity: nextEntity,
      headers,
      sampleRows: rows.slice(0, 5),
    });
    setMapping(suggestion.mapping);
    setNotes(suggestion.notes ?? null);
    setUsedLlm(suggestion.usedLlm);
    setConfidence(suggestion.confidence);
    return suggestion;
  };

  const onFile = async (file: File | null) => {
    setSourceHeaders([]);
    setSourceRows([]);
    setMapping({});
    setNotes(null);
    setUsedLlm(false);
    setConfidence(null);
    setPendingMeta(null);
    if (!file) return;
    setBusy(true);
    setPendingMeta({ fileName: file.name, rowCount: 0, columnCount: 0 });
    try {
      const text = await file.text();
      const parsed = parseFlexibleCsv(text);
      if (parsed.headers.length === 0) {
        showToast("Fichier CSV vide ou illisible", "error");
        return;
      }
      setPendingMeta({
        fileName: file.name,
        rowCount: parsed.rows.length,
        columnCount: parsed.headers.length,
      });
      const suggestion = await requestMapping(entity, parsed.headers, parsed.rows);
      setSourceHeaders(parsed.headers);
      setSourceRows(parsed.rows);
      showToast(
        suggestion.usedLlm ? "Mapping proposé (IA)" : "Mapping proposé (automatique)",
        "success",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Conversion impossible", "error");
    } finally {
      setBusy(false);
      setPendingMeta(null);
    }
  };

  const onEntityChange = async (next: DataImportEntity) => {
    setEntity(next);
    setMapping({});
    setNotes(null);
    setConfidence(null);
    setUsedLlm(false);
    if (sourceHeaders.length === 0) return;
    setBusy(true);
    setPendingMeta({
      rowCount: sourceRows.length,
      columnCount: sourceHeaders.length,
    });
    try {
      await requestMapping(next, sourceHeaders, sourceRows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Mapping impossible", "error");
    } finally {
      setBusy(false);
      setPendingMeta(null);
    }
  };

  const partCount = Math.max(1, Math.ceil(sourceRows.length / DATA_IMPORT_MAX_ROWS));

  const onDownload = () => {
    if (sourceRows.length === 0) return;
    void (async () => {
      const keys = targets.map((t) => t.key);
      const converted = applyMappingToRows(sourceRows, mapping, keys);
      const parts = buildPlanwiseCsvParts(keys, converted, {
        baseFilename: `planwise-${DATA_IMPORT_ENTITY_META[entity].templateFile}`,
        maxRows: DATA_IMPORT_MAX_ROWS,
      });
      await downloadTextFiles(parts);
      if (parts.length === 1) {
        showToast(
          "CSV Planwise téléchargé — validez-le puis importez sur l’écran principal",
          "success",
        );
      } else {
        showToast(
          `${parts.length} fichiers téléchargés (max ${DATA_IMPORT_MAX_ROWS.toLocaleString("fr-FR")} lignes chacun) — importez-les un par un`,
          "success",
        );
      }
    })();
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Import de données
          </p>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Convertir mon export
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          Fermer
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Déposez un export de votre ancien outil (CSV, séparateur <code>;</code> ou{" "}
            <code>,</code>). L’intelligence artificielle propose le mapping des colonnes vers le
            format Planwise — vérifiez-le, téléchargez le fichier, puis importez-le depuis l’écran
            principal.
          </p>

          <PermissionGate permission="data_import.run">
            <div className={`${CARD} sm:flex sm:flex-wrap sm:items-end sm:gap-3`}>
              <label className="text-xs space-y-1 block">
                <span className="font-medium text-slate-700 dark:text-slate-200">Entité cible</span>
                <select
                  value={entity}
                  disabled={busy}
                  onChange={(e) => void onEntityChange(e.target.value as DataImportEntity)}
                  className="block w-full sm:w-auto rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm"
                >
                  {[...DATA_IMPORT_ENTITIES]
                    .sort(
                      (a, b) => DATA_IMPORT_ENTITY_META[a].order - DATA_IMPORT_ENTITY_META[b].order,
                    )
                    .map((e) => (
                      <option key={e} value={e}>
                        {DATA_IMPORT_ENTITY_META[e].order}. {DATA_IMPORT_ENTITY_META[e].label}
                      </option>
                    ))}
                </select>
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                aria-label="Export à convertir"
                disabled={busy}
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
                className="block w-full flex-1 cursor-pointer text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:file:bg-slate-800"
              />
            </div>
          </PermissionGate>

          {busy && (
            <MappingAnalysisLoader
              fileName={pendingMeta?.fileName}
              rowCount={pendingMeta?.rowCount || null}
              columnCount={pendingMeta?.columnCount || null}
            />
          )}

          {showMapping && (
            <div className={`${CARD}`}>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {sourceRows.length} ligne(s) · {mappedRequired}/{requiredCount} champ(s) requis
                mappés
                {confidence ? ` · confiance ${CONFIDENCE_FR[confidence]}` : ""}
                {usedLlm ? " · IA" : " · automatique"}
              </p>
              {notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">{notes}</p>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 max-h-[min(50vh,28rem)]">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Champ Planwise</th>
                      <th className="px-2 py-1.5 font-medium">Colonne source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((field) => (
                      <tr
                        key={field.key}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-2 py-1.5">
                          <span className="font-mono text-slate-800 dark:text-slate-100">
                            {field.key}
                          </span>
                          {field.required && (
                            <span className="ml-1 text-red-500" title="requis">
                              *
                            </span>
                          )}
                          <span className="block text-slate-500 dark:text-slate-400">
                            {field.label}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={mapping[field.key] ?? ""}
                            onChange={(e) => {
                              const next = e.target.value || null;
                              setMapping((prev) => {
                                const updated = { ...prev, [field.key]: next };
                                if (next) {
                                  for (const [k, v] of Object.entries(updated)) {
                                    if (k !== field.key && v === next) updated[k] = null;
                                  }
                                }
                                return updated;
                              });
                            }}
                            className="w-full max-w-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-1.5 py-1"
                          >
                            <option value="">— non mappé —</option>
                            {sourceHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {partCount > 1 && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Ce fichier dépasse {DATA_IMPORT_MAX_ROWS.toLocaleString("fr-FR")} lignes : le
                  téléchargement produira {partCount} CSV à importer séparément (dans le même
                  ordre).
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={mappedRequired < requiredCount}
                  onClick={onDownload}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {partCount > 1
                    ? `Télécharger ${partCount} CSV Planwise`
                    : "Télécharger le CSV Planwise"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium"
                >
                  Retour à l’import
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

const ROLLBACK_STATUS_LINES = [
  "Suppression définitive des fiches créées…",
  "Nettoyage en cours dans Planwise…",
  "Finalisation de l’annulation…",
];

function ImportHistoryPanel({ refreshKey }: { refreshKey: number }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<DataImportRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listDataImportRuns({ limit: 20, offset: 0 });
      setItems(res.items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Historique indisponible", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshKey drives reload
  }, [refreshKey]);

  const onRollback = async (run: DataImportRunSummary) => {
    const n = run.createdCount;
    const ok = await confirm({
      title: "Annuler cet import ?",
      description: (
        <>
          Suppression définitive de <strong>{n}</strong> fiche(s) créée(s) (
          {DATA_IMPORT_ENTITY_META[run.entity].label}). Les mises à jour de cet import ne sont pas
          annulées. Les données liées (dossiers, interventions…) ne sont pas cascadées.
        </>
      ),
      confirmLabel: "Supprimer définitivement",
      variant: "danger",
    });
    if (!ok) return;
    setRollingBackId(run.id);
    try {
      const res = await rollbackDataImportRun(run.id);
      showToast(`${res.deleted} fiche(s) supprimée(s)`, "success");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Annulation impossible", "error");
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <div className={CARD}>
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Historique des imports
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Annulez un lot pour supprimer définitivement les fiches créées (pas les mises à jour).
        </p>
      </div>

      {rollingBackId && (
        <SoftProgressLoader
          key={rollingBackId}
          badge="DEL"
          title="Annulation de l’import en cours"
          statusLines={ROLLBACK_STATUS_LINES}
        />
      )}

      {loading && !rollingBackId ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Aucun import enregistré.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {items.map((run) => {
            const meta = DATA_IMPORT_ENTITY_META[run.entity];
            const date = new Date(run.createdAt).toLocaleString("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            });
            const canRollback =
              run.status === "completed" && run.createdCount > 0 && !rollingBackId;
            return (
              <li
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs bg-white dark:bg-slate-900"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {meta.label}
                    {run.fileName ? (
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        {" "}
                        · {run.fileName}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {date} · {run.stats.created} créé(s), {run.stats.updated} màj
                    {run.status === "rolled_back" ? (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">· annulé</span>
                    ) : null}
                  </p>
                </div>
                <PermissionGate permission="data_import.run">
                  {canRollback ? (
                    <button
                      type="button"
                      onClick={() => void onRollback(run)}
                      className="shrink-0 rounded-lg border border-red-200 dark:border-red-900/50 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      Annuler cet import
                    </button>
                  ) : null}
                </PermissionGate>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EntityImportPanel({
  entity,
  entities,
  onSelectEntity,
  onImportDone,
}: {
  entity: DataImportEntity;
  entities: DataImportEntity[];
  onSelectEntity: (entity: DataImportEntity) => void;
  onImportDone?: () => void;
}) {
  const { showToast } = useToast();
  const meta = DATA_IMPORT_ENTITY_META[entity];
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"validate" | "run" | null>(null);
  const [preview, setPreview] = useState<DataImportValidateResponse | null>(null);
  const [result, setResult] = useState<DataImportRunResponse | null>(null);

  useEffect(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setBusy(null);
  }, [entity]);

  const canRun = Boolean(file) && preview && preview.errorCount === 0;

  const onValidate = async () => {
    if (!file) return;
    setBusy("validate");
    setResult(null);
    try {
      const res = await validateDataImport(entity, file);
      setPreview(res);
      if (res.errorCount > 0) {
        showToast(`${res.errorCount} erreur(s) — corrigez le fichier`, "error");
      } else {
        showToast(`Validation OK (${res.validRows} ligne(s))`, "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Validation impossible", "error");
    } finally {
      setBusy(null);
    }
  };

  const onRun = async () => {
    if (!file || !canRun) return;
    setBusy("run");
    try {
      const res = await runDataImport(entity, file);
      setResult(res);
      onImportDone?.();
      showToast(
        `Import terminé : ${res.created} créé(s), ${res.updated} mis à jour, ${res.skipped} ignoré(s)`,
        res.errors.some((e) => e.severity === "error") ? "error" : "success",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import impossible", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={CARD}>
      <div
        className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1"
        role="tablist"
        aria-label="Type de données à importer"
      >
        {entities.map((e) => {
          const m = DATA_IMPORT_ENTITY_META[e];
          const active = e === entity;
          return (
            <button
              key={e}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={busy !== null}
              onClick={() => onSelectEntity(e)}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                active
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span className="tabular-nums opacity-80">{m.order}.</span> {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{meta.label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{meta.hint}</p>
        </div>
        <a
          href={`/import-templates/${meta.templateFile}`}
          download
          className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
        >
          Modèle CSV
        </a>
      </div>

      {meta.details.length > 0 && (
        <details open className="text-xs text-slate-600 dark:text-slate-300">
          <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-200">
            Colonnes clés
          </summary>
          <ul className="mt-1.5 space-y-1 list-disc list-inside">
            {meta.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label={`Fichier ${meta.label}`}
          disabled={busy !== null}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setResult(null);
          }}
          className="block w-full flex-1 cursor-pointer text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:file:bg-slate-800 disabled:opacity-50"
        />
        <PermissionGate permission="data_import.run">
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={!file || busy !== null}
              onClick={() => void onValidate()}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              {busy === "validate" ? "Validation…" : "Valider"}
            </button>
            <button
              type="button"
              disabled={!canRun || busy !== null}
              onClick={() => void onRun()}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy === "run" ? "Import…" : "Importer"}
            </button>
          </div>
        </PermissionGate>
      </div>

      {file && !busy && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          Fichier : {file.name}
          {preview ? ` · ${preview.totalRows.toLocaleString("fr-FR")} ligne(s)` : ""}
        </p>
      )}

      {busy && (
        <SoftProgressLoader
          key={busy}
          badge="CSV"
          title={
            busy === "run"
              ? `Import de ${meta.label.toLowerCase()} en cours`
              : `Validation de ${meta.label.toLowerCase()} en cours`
          }
          statusLines={busy === "run" ? IMPORT_STATUS_LINES : VALIDATE_STATUS_LINES}
          fileName={file?.name}
          detail={
            preview
              ? `${preview.totalRows.toLocaleString("fr-FR")} ligne(s)`
              : file
                ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo`
                : null
          }
        />
      )}

      {preview && !busy && (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
          <p>
            Aperçu : {preview.totalRows} ligne(s), {preview.validRows} valide(s),{" "}
            {preview.errorCount} erreur(s), {preview.warningCount} warning(s)
          </p>
          <ErrorsTable errors={preview.errors} />
          {preview.errors.length > 0 && (
            <button
              type="button"
              className="text-brand-600 hover:underline"
              onClick={() => downloadErrorsCsv(entity, preview.errors)}
            >
              Télécharger les erreurs (CSV)
            </button>
          )}
        </div>
      )}

      {result && !busy && (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
          <p>
            Résultat : {result.created} créé(s), {result.updated} mis à jour, {result.skipped}{" "}
            ignoré(s)
          </p>
          <ErrorsTable errors={result.errors} />
          {result.errors.length > 0 && (
            <button
              type="button"
              className="text-brand-600 hover:underline"
              onClick={() => downloadErrorsCsv(entity, result.errors)}
            >
              Télécharger le rapport d’erreurs
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DataImportSettingsPage() {
  const [convertOpen, setConvertOpen] = useState(false);
  const [entity, setEntity] = useState<DataImportEntity>("customers");
  const [historyKey, setHistoryKey] = useState(0);
  const entities = useMemo(
    () =>
      [...DATA_IMPORT_ENTITIES].sort(
        (a, b) => DATA_IMPORT_ENTITY_META[a].order - DATA_IMPORT_ENTITY_META[b].order,
      ),
    [],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Import de données
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            CSV UTF-8, séparateur <code>;</code> · max{" "}
            {Math.round(DATA_IMPORT_MAX_FILE_BYTES / (1024 * 1024))} Mo /{" "}
            {DATA_IMPORT_MAX_ROWS.toLocaleString("fr-FR")} lignes · importer dans l’ordre des
            onglets.
          </p>
        </div>
        <PermissionGate permission="data_import.run">
          <button
            type="button"
            onClick={() => setConvertOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <AssistantIcon className="h-4 w-4" />
            Convertir mon export
          </button>
        </PermissionGate>
      </div>

      <details
        open
        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-xs text-slate-600 dark:text-slate-300"
      >
        <summary className="cursor-pointer font-medium text-slate-800 dark:text-slate-100">
          À propos de <code className="text-[11px]">externalId</code>
        </summary>
        <p className="mt-1.5 leading-relaxed">
          Identifiant de la ligne dans votre ancien outil. Unique par type de fichier : évite les
          doublons au ré-import et relie les fichiers (ex. <code>customerExternalId</code> ={" "}
          <code>externalId</code> du client).
        </p>
      </details>

      <EntityImportPanel
        entity={entity}
        entities={entities}
        onSelectEntity={setEntity}
        onImportDone={() => setHistoryKey((k) => k + 1)}
      />

      <ImportHistoryPanel refreshKey={historyKey} />

      <ConvertExportOverlay open={convertOpen} onClose={() => setConvertOpen(false)} />
    </div>
  );
}
