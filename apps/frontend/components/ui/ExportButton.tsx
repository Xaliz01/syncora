"use client";

import React, { useState } from "react";

interface ExportButtonProps {
  onExport: (format: "pdf" | "xlsx") => Promise<void>;
  formats?: ("pdf" | "xlsx")[];
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function ExportButton({
  onExport,
  formats = ["xlsx", "pdf"],
  label = "Exporter",
  className = "",
  size = "sm",
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleExport = async (format: "pdf" | "xlsx") => {
    setOpen(false);
    setLoading(true);
    try {
      await onExport(format);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (formats.length === 1) {
    return (
      <button
        type="button"
        onClick={() => handleExport(formats[0])}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 transition disabled:opacity-50 ${
          size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
        } ${className}`}
      >
        <ExportIcon />
        {loading ? "Export…" : label}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 transition disabled:opacity-50 ${
          size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
        }`}
      >
        <ExportIcon />
        {loading ? "Export…" : label}
        <svg
          className="h-3 w-3 ml-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
            {formats.includes("xlsx") && (
              <button
                type="button"
                onClick={() => handleExport("xlsx")}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <SpreadsheetIcon />
                Excel (.xlsx)
              </button>
            )}
            {formats.includes("pdf") && (
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <PdfIcon />
                PDF
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ExportIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function SpreadsheetIcon() {
  return (
    <svg
      className="h-4 w-4 text-green-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg
      className="h-4 w-4 text-red-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}
