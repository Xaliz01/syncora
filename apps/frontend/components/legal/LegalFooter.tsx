import Link from "next/link";
import { LEGAL_NAV_LINKS } from "@/lib/legal/routes";

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400 ${className}`}
      aria-label="Informations légales"
    >
      {LEGAL_NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="hover:text-brand-600 dark:hover:text-brand-400 transition"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
          © {new Date().getFullYear()} Planwise — CRM des opérations terrain
        </p>
        <LegalLinks className="justify-center" />
      </div>
    </footer>
  );
}
