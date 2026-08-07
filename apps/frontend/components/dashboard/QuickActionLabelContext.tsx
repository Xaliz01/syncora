"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type QuickActionLabelContextValue = {
  pageLabel: string | null;
  setPageLabel: (label: string | null) => void;
};

const QuickActionLabelContext = createContext<QuickActionLabelContextValue | null>(null);

export function QuickActionLabelProvider({ children }: { children: React.ReactNode }) {
  const [pageLabel, setPageLabelState] = useState<string | null>(null);
  const setPageLabel = useCallback((label: string | null) => {
    setPageLabelState(label?.trim() ? label.trim() : null);
  }, []);
  const value = useMemo(() => ({ pageLabel, setPageLabel }), [pageLabel, setPageLabel]);
  return (
    <QuickActionLabelContext.Provider value={value}>{children}</QuickActionLabelContext.Provider>
  );
}

export function useQuickActionPageLabel(): string | null {
  return useContext(QuickActionLabelContext)?.pageLabel ?? null;
}

/** Enregistre un libellé pour l’étoile « action rapide » (fiche détail, etc.). */
export function useRegisterQuickActionLabel(label: string | null | undefined) {
  const ctx = useContext(QuickActionLabelContext);
  const setPageLabel = ctx?.setPageLabel;
  React.useEffect(() => {
    if (!setPageLabel) return;
    setPageLabel(label ?? null);
    return () => setPageLabel(null);
  }, [setPageLabel, label]);
}
