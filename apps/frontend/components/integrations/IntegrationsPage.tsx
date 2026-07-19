"use client";

import { PennylaneIntegrationSection } from "@/components/integrations/PennylaneIntegrationSection";
import { QontoIntegrationSection } from "@/components/integrations/QontoIntegrationSection";

export function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Intégrations</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Connectez Planwise à votre outil de facturation pour éviter la double saisie. Une seule
          connexion (Pennylane ou Qonto) est active à la fois : en connecter une autre remplace la
          précédente.
        </p>
      </div>

      <div className="space-y-4">
        <PennylaneIntegrationSection />
        <QontoIntegrationSection />
      </div>
    </div>
  );
}
