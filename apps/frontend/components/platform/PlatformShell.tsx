"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PlatformAuthUser } from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [staff, setStaff] = useState<PlatformAuthUser | null>(null);
  const [ready, setReady] = useState(false);

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

  const logout = () => {
    platformApi.clearPlatformToken();
    setStaff(null);
    router.replace("/platform/login");
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Chargement…
      </div>
    );
  }

  if (pathname === "/platform/login") {
    return <>{children}</>;
  }

  if (!staff) return null;

  const nav = [
    { href: "/platform", label: "Organisations" },
    { href: "/platform/users", label: "Utilisateurs" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Planwise Backoffice
              </p>
              <p className="text-xs text-slate-500">{staff.email}</p>
            </div>
            <nav className="flex gap-1">
              {nav.map((item) => {
                const active =
                  item.href === "/platform"
                    ? pathname === "/platform" || pathname.startsWith("/platform/organizations")
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      active
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
