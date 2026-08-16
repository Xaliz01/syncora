"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PlatformAuthUser } from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";

const NAV = [
  { href: "/platform", label: "Tableau de bord" },
  { href: "/platform/organizations", label: "Organisations" },
  { href: "/platform/users", label: "Utilisateurs" },
  { href: "/platform/integrations", label: "Intégrations" },
  { href: "/platform/prospection", label: "Prospection" },
  { href: "/platform/email-templates", label: "E-mails" },
  { href: "/platform/audience", label: "Audience" },
  { href: "/platform/crons", label: "Crons" },
] as const;

function navItemActive(pathname: string, href: string) {
  if (href === "/platform") {
    return pathname === "/platform";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [staff, setStaff] = useState<PlatformAuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = platformApi.getStoredPlatformToken();
    if (!token) {
      setReady(true);
      if (pathname !== "/platform/login") {
        router.replace("/platform/login");
      }
      return;
    }
    platformApi
      .platformMe()
      .then((user) => {
        setStaff(user);
        setReady(true);
      })
      .catch(() => {
        platformApi.clearPlatformToken();
        setReady(true);
        router.replace("/platform/login");
      });
  }, [pathname, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const logout = () => {
    platformApi.clearPlatformToken();
    setStaff(null);
    router.replace("/platform/login");
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <PlanwiseLoader size="lg" label="Chargement…" />
      </div>
    );
  }

  if (pathname === "/platform/login") {
    return <>{children}</>;
  }

  if (!staff) return null;

  const linkClass = (active: boolean) =>
    `block rounded-md px-3 py-2 text-sm ${
      active
        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                Planwise Backoffice
              </p>
              <p className="truncate text-xs text-slate-500">{staff.email}</p>
            </div>
            <nav
              className="ml-3 hidden items-center gap-1 md:flex"
              aria-label="Navigation backoffice"
            >
              {NAV.map((item) => {
                const active = navItemActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} className={linkClass(active)}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm dark:border-slate-700 sm:px-3"
            >
              <span className="sm:hidden">Quitter</span>
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 md:hidden dark:border-slate-800">
            <nav
              className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3"
              aria-label="Navigation mobile"
            >
              {NAV.map((item) => {
                const active = navItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={linkClass(active)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl overflow-x-auto px-4 py-6">{children}</main>
    </div>
  );
}
