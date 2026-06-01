"use client";

import React from "react";

export function TestDataBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center shrink-0 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
      title="Donnée de démonstration injectée pendant l’essai"
    >
      Démo
    </span>
  );
}

export function TestDataBadgeIf({
  isTestData,
  className,
}: {
  isTestData?: boolean;
  className?: string;
}) {
  if (!isTestData) return null;
  return <TestDataBadge className={className} />;
}
