"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
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
  if (href === "/cases") {
    return currentPath === "/cases" || (currentPath.startsWith("/cases/") && !currentPath.startsWith("/cases/calendar"));
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  currentPath,
  onClick
}: {
  href: string;
  label: string;
  currentPath: string;
  onClick?: () => void;
}) {
  const isActive = isLinkActive(currentPath, href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-md px-3 py-2 text-sm transition ${
        isActive
          ? "bg-brand-600/10 text-brand-600 font-medium"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}

function SidebarContent({
  menuSections,
  pathname,
  onNavigate
}: {
  menuSections: MenuSection[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-5 px-3 py-4">
      {menuSections.map((section) => (
        <section key={section.label}>
          <h2 className="mb-1.5 px-3 text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            {section.label}
          </h2>
          <div className="space-y-0.5">
            {section.links.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                currentPath={pathname}
                onClick={onNavigate}
              />
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuSections: MenuSection[] = [
    { label: "Général", links: [{ label: "Tableau de bord", href: "/" }] },
    {
      label: "Dossiers",
      links: [
        { label: "Tous les dossiers", href: "/cases" },
        { label: "Calendrier", href: "/cases/calendar" },
        { label: "Mouvements de stock", href: "/stock" }
      ]
    }
  ];
  if (user?.role === "admin") {
    menuSections.push(
      {
        label: "Gestion de la flotte",
        links: [
          { label: "Véhicules", href: "/fleet/vehicles" },
          { label: "Techniciens", href: "/fleet/technicians" }
        ]
      },
      {
        label: "Utilisateurs",
        links: [{ label: "Gérer les utilisateurs", href: "/users" }]
      },
      {
        label: "Paramètres",
        links: [
          { label: "Catalogue articles", href: "/settings/stock/articles" },
          { label: "Modèles de dossier", href: "/settings/case-templates" },
          { label: "Permissions", href: "/settings/permissions" },
          { label: "Profils", href: "/settings/profiles" }
        ]
      }
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden -ml-1 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold text-sm">
                S
              </span>
              <div className="hidden sm:block">
                <div className="font-semibold text-sm leading-tight">Syncora</div>
                <div className="text-[11px] text-slate-500 leading-tight">CRM des opérations terrain</div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">{user?.name ?? user?.email}</span>
              <span className="rounded-full bg-brand-600/10 px-2 py-0.5 text-xs font-medium text-brand-600">
                {user?.role === "admin" ? "Administrateur" : "Membre"}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:flex-shrink-0 border-r border-slate-200 bg-white sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <SidebarContent menuSections={menuSections} pathname={pathname} />
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="absolute top-0 left-0 bottom-0 w-[280px] bg-white shadow-xl overflow-y-auto">
              <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold text-sm">
                  S
                </span>
                <div>
                  <div className="font-semibold text-sm leading-tight">Syncora</div>
                  <div className="text-[11px] text-slate-500 leading-tight">Espace organisation</div>
                </div>
              </div>
              <SidebarContent
                menuSections={menuSections}
                pathname={pathname}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
