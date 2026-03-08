"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useAuth } from "@/components/auth/AuthContext";

interface MenuLink {
  label: string;
  href: string;
}

interface MenuSection {
  label: string;
  links: MenuLink[];
}

function isLinkActive(currentPath: string, href: string): boolean {
  if (href === "/") return currentPath === "/";
  if (href === "/users") {
    return currentPath === "/users" || currentPath.startsWith("/users/");
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  currentPath
}: {
  href: string;
  label: string;
  currentPath: string;
}) {
  const isActive = isLinkActive(currentPath, href);
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm transition ${
        isActive
          ? "bg-brand-50 text-brand-700 border border-brand-200"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const menuSections: MenuSection[] = [{ label: "Général", links: [{ label: "Accueil", href: "/" }] }];
  if (user?.role === "admin") {
    menuSections.push(
      {
        label: "Utilisateurs",
        links: [{ label: "Gérer les utilisateurs", href: "/users" }]
      },
      {
        label: "Paramètres",
        links: [
          { label: "Permissions", href: "/settings/permissions" },
          { label: "Profils", href: "/settings/profiles" }
        ]
      }
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm h-fit lg:sticky lg:top-6">
            <div className="mb-4">
              <div className="font-semibold text-lg">Syncora</div>
              <div className="text-xs text-slate-500">Espace organisation</div>
            </div>

            <nav className="space-y-4">
              {menuSections.map((section) => (
                <section key={section.label}>
                  <h2 className="mb-2 px-1 text-xs uppercase tracking-wide text-slate-400">
                    {section.label}
                  </h2>
                  <div className="space-y-1">
                    {section.links.map((link) => (
                      <NavLink
                        key={link.href}
                        href={link.href}
                        label={link.label}
                        currentPath={pathname}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </nav>
          </aside>

          <div className="space-y-4">
            <header className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm flex items-center justify-between">
              <div className="text-sm text-slate-700">
                <span className="font-medium">{user?.name ?? user?.email}</span>
                <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 border border-slate-200">
                  {user?.role}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Déconnexion
              </button>
            </header>

            <main className="rounded-xl border border-slate-200 bg-white/95 p-5 shadow-sm">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
