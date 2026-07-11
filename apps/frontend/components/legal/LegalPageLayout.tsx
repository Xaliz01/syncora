import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_LAST_UPDATED } from "@/lib/legal/config";
import { LegalFooter } from "@/components/legal/LegalFooter";

export function LegalPageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold">
              P
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">Planwise</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
          >
            Retour
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-10 space-y-8">
          <header className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Dernière mise à jour : {LEGAL_LAST_UPDATED}
            </p>
          </header>
          <div className="space-y-8">{children}</div>
        </article>
      </main>

      <LegalFooter />
    </div>
  );
}
