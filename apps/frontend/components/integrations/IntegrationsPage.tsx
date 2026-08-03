"use client";

import { PennylaneIntegrationSection } from "@/components/integrations/PennylaneIntegrationSection";
import { QontoIntegrationSection } from "@/components/integrations/QontoIntegrationSection";
import { isCrispEnabled, openCrispChat } from "@/lib/crisp-client";

export function IntegrationsPage() {
  const canOpenChat = isCrispEnabled();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Intégrations</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Connectez Planwise à votre outil de facturation pour éviter la double saisie. Une seule
          connexion est active à la fois : en connecter une autre remplace la précédente.
        </p>
      </div>

      <div
        role="status"
        className="rounded-xl border-2 border-brand-400 dark:border-brand-500 bg-brand-50 dark:bg-brand-950/50 px-5 py-4 shadow-sm ring-1 ring-brand-200 dark:ring-brand-800"
      >
        <p className="text-base font-semibold text-brand-900 dark:text-brand-100">
          Votre outil de facturation n’est pas dans la liste ?
        </p>
        <p className="mt-1.5 text-sm text-brand-800 dark:text-brand-200 max-w-2xl leading-relaxed">
          Contactez-nous dans le chat : on l’intégrera rapidement pour vous.
        </p>
        {canOpenChat ? (
          <button
            type="button"
            onClick={() => openCrispChat()}
            className="mt-3 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 transition shadow-sm"
          >
            Ouvrir le chat
          </button>
        ) : (
          <p className="mt-3 text-sm font-medium text-brand-900 dark:text-brand-100">
            Utilisez le bouton de chat en bas à droite de l’écran.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <PennylaneIntegrationSection />
        <QontoIntegrationSection />
      </div>
    </div>
  );
}
