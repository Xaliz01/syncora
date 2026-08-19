"use client";

import Link from "next/link";
import React, { useEffect, useId, type FormEventHandler, type ReactNode } from "react";
import { createPortal } from "react-dom";

function cn(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Libellé de champ — aligné sur « Nouvelle organisation ». */
export const formFieldLabelClassName =
  "block text-xs font-medium text-slate-600 dark:text-slate-300";

/** Champ texte / select / textarea. */
export const formFieldInputClassName =
  "mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

/** Aide sous un champ. */
export const formFieldHintClassName = "mt-1 text-[11px] text-slate-500 dark:text-slate-400";

/** Fil d’Ariane page (listes / fiches / formulaires) — même style que FormPage. */
export function PageBreadcrumb({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500"
    >
      &larr; {label}
    </Link>
  );
}

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

export type FormDialogSize = keyof typeof SIZE_CLASS;

type FormDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Pied d’actions (Annuler / primaire) — toujours en bas à droite. */
  footer?: ReactNode;
  /** Contenu additionnel sous la description (ex. « Tout sélectionner »). */
  headerExtra?: ReactNode;
  size?: FormDialogSize;
  /** Empêche la fermeture (backdrop, Escape, croix). */
  closeDisabled?: boolean;
  titleId?: string;
  zClassName?: string;
  /** Si fourni, le panneau est un `<form>` (submit via footer). */
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export function FormDialogCancelButton({
  children = "Annuler",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function FormDialogPrimaryButton({
  children,
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Section de formulaire (titre uppercase). */
export function FormDialogSection({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  const autoId = useId();
  const headingId = id ?? autoId;
  return (
    <section className="space-y-4" aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Dialogue de formulaire homogène : header + corps scrollable + footer d’actions en bas à droite.
 * Référence visuelle : « Nouvelle organisation ».
 */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  headerExtra,
  size = "md",
  closeDisabled = false,
  titleId: titleIdProp,
  zClassName = "z-[200]",
  onSubmit,
}: FormDialogProps) {
  const autoTitleId = useId();
  const titleId = titleIdProp ?? autoTitleId;

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeDisabled, onClose]);

  if (!open || typeof document === "undefined") return null;

  const requestClose = () => {
    if (closeDisabled) return;
    onClose();
  };

  const panelClassName = cn(
    "flex w-full max-h-[calc(100dvh-2rem)] flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl animate-org-switch-pop-in",
    SIZE_CLASS[size],
  );

  const panel = (
    <>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          {description ? (
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</div>
          ) : null}
          {headerExtra}
        </div>
        <button
          type="button"
          onClick={requestClose}
          disabled={closeDisabled}
          className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50"
          aria-label="Fermer"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
        {children}
      </div>

      {footer ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 px-5 py-3 sm:px-6">
          {footer}
        </div>
      ) : null}
    </>
  );

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-slate-950/50 p-4 animate-org-switch-backdrop",
        zClassName,
      )}
      role="presentation"
      onClick={requestClose}
    >
      {onSubmit ? (
        <form
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={panelClassName}
          onClick={(e) => e.stopPropagation()}
          onSubmit={onSubmit}
        >
          {panel}
        </form>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={panelClassName}
          onClick={(e) => e.stopPropagation()}
        >
          {panel}
        </div>
      )}
    </div>,
    document.body,
  );
}

/**
 * Formulaire page (hors dialog) — même langage que FormDialog :
 * en-tête de page, panneau, sections, actions en bas à droite.
 */
export function FormPage({
  title,
  description,
  children,
  footer,
  error,
  onSubmit,
  maxWidthClassName = "w-full",
  breadcrumb,
  asForm = true,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  error?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  maxWidthClassName?: string;
  /** Lien vers la page précédente (ex. liste). */
  breadcrumb?: { href: string; label: string };
  /**
   * Si false, le panneau n’est pas un `<form>` (enfants avec leur propre form + footer via `form="id"`).
   */
  asForm?: boolean;
}) {
  const panelClassName =
    "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-none";

  const panelBody = (
    <>
      <div className="space-y-8 px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 px-5 py-3 sm:px-6">
        {footer}
      </div>
    </>
  );

  return (
    <div className={cn("w-full space-y-6", maxWidthClassName)}>
      <div>
        {breadcrumb ? <PageBreadcrumb href={breadcrumb.href} label={breadcrumb.label} /> : null}
        <h1
          className={cn(
            "text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl",
            breadcrumb ? "mt-3" : null,
          )}
        >
          {title}
        </h1>
        {description ? (
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</div>
        ) : null}
      </div>

      {error ? (
        typeof error === "string" || typeof error === "number" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : (
          // Déjà stylé (ex. AppErrorAlert) — éviter une double carte rouge
          error
        )
      ) : null}

      {asForm ? (
        <form onSubmit={onSubmit} className={panelClassName}>
          {panelBody}
        </form>
      ) : (
        <div className={panelClassName}>{panelBody}</div>
      )}
    </div>
  );
}
