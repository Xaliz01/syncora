"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

type DemoLine = { l: string; q: number; p: string; v: string };

function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function vatLabel(rate: string): string {
  if (rate.startsWith("FR_")) {
    const n = Number(rate.slice(3)) / 10;
    return Number.isFinite(n) ? `${n} %` : rate;
  }
  const n = Number(rate);
  if (Number.isFinite(n) && n <= 1) return `${(n * 100).toFixed((n * 100) % 1 === 0 ? 0 : 1)} %`;
  return rate;
}

function DemoInvoicePreviewContent() {
  const searchParams = useSearchParams();
  const invoiceNumber = searchParams.get("number") || "DEMO";
  const title = searchParams.get("title") || "Dossier";
  const customer = searchParams.get("customer") || "Client";
  const amountHt = searchParams.get("amountHt") || "0";
  const draft = searchParams.get("draft") !== "0";

  const lines = useMemo((): DemoLine[] => {
    const raw = searchParams.get("lines");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as DemoLine[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [searchParams]);

  const computedHt = lines.reduce((sum, line) => sum + Number(line.p) * Number(line.q), 0);
  const displayHt = Number(amountHt) || computedHt;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Facturation démo Planwise
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{invoiceNumber}</h1>
            <p className="mt-1 text-sm text-slate-600">{title}</p>
          </div>
          <span
            className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${
              draft ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {draft ? "Brouillon" : "Validée"}
          </span>
        </div>

        <div className="mt-6 grid gap-1 text-sm">
          <p className="text-slate-500">Client</p>
          <p className="font-medium">{customer}</p>
        </div>

        <table className="mt-8 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 font-medium">Désignation</th>
              <th className="py-2 font-medium text-right">Qté</th>
              <th className="py-2 font-medium text-right">P.U. HT</th>
              <th className="py-2 font-medium text-right">TVA</th>
              <th className="py-2 font-medium text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-slate-500">
                  Aucune ligne
                </td>
              </tr>
            ) : (
              lines.map((line, index) => {
                const lineHt = Number(line.p) * Number(line.q);
                return (
                  <tr key={`${line.l}-${index}`} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{line.l}</td>
                    <td className="py-2 text-right tabular-nums">{line.q}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatEuro(Number(line.p) || 0)}
                    </td>
                    <td className="py-2 text-right">{vatLabel(line.v)}</td>
                    <td className="py-2 text-right tabular-nums">{formatEuro(lineHt || 0)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-slate-500">Total HT</p>
            <p className="text-xl font-semibold tabular-nums">{formatEuro(displayHt)}</p>
          </div>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          Document simulé pour l’essai Planwise — non transmis à un outil de facturation externe.
        </p>
      </div>
    </div>
  );
}

export default function DemoInvoicePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 px-4 py-8 text-sm text-slate-500">
          Chargement de l’aperçu…
        </div>
      }
    >
      <DemoInvoicePreviewContent />
    </Suspense>
  );
}
