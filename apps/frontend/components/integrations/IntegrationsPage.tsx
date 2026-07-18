"use client";

import { PennylaneIntegrationSection } from "@/components/integrations/PennylaneIntegrationSection";

export function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Intégrations</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Connectez Planwise à vos outils compta et métier pour éviter la double saisie.
        </p>
      </div>

      <div className="space-y-4">
        <PennylaneIntegrationSection />
      </div>
    </div>
  );
}
