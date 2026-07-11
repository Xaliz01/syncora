"use client";

import Link from "next/link";

export function LegalConsentCheckbox({
  checked,
  onChange,
  id = "legal-consent",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span>
        J&apos;accepte les{" "}
        <Link href="/cgu" target="_blank" className="text-brand-600 dark:text-brand-400 underline">
          Conditions Générales d&apos;Utilisation
        </Link>{" "}
        et la{" "}
        <Link
          href="/politique-confidentialite"
          target="_blank"
          className="text-brand-600 dark:text-brand-400 underline"
        >
          Politique de confidentialité
        </Link>
        .
      </span>
    </label>
  );
}
