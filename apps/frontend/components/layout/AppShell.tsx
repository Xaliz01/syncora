"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { hasActiveSubscriptionAccess } from "@/lib/subscription-access";
import { OrganizationSwitcher } from "@/components/organization/OrganizationSwitcher";
import { hasPermission } from "@/lib/auth-permissions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

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
  if (href === "/customers") {
    return currentPath === "/customers" || currentPath.startsWith("/customers/");
  }
  if (href === "/organization") {
    return currentPath === "/organization" || currentPath.startsWith("/organization/");
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
          ? "bg-brand-600/10 text-brand-600 dark:text-brand-400 font-medium"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
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
          <h2 className="mb-1.5 px-3 text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
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
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const subscriptionOk = hasActiveSubscriptionAccess(user);

  const menuSections: MenuSection[] = subscriptionOk
    ? [
        {
          label: "Général",
          links: [
            { label: "Tableau de bord", href: "/" },
            ...(user ? [{ label: "Mon organisation", href: "/organization" }] : [])
          ]
        },
        {
          label: "Dossiers",
          links: [
            { label: "Tous les dossiers", href: "/cases" },
            { label: "Clients", href: "/customers" },
            { label: "Calendrier", href: "/cases/calendar" },
            { label: "Mouvements de stock", href: "/stock" }
          ]
        }
      ]
    : [
        {
          label: "Abonnement",
          links: user ? [{ label: "Mon organisation et abonnement", href: "/organization" }] : []
        }
      ];
  if (subscriptionOk && user) {
    const fleetLinks: MenuLink[] = [];
    if (hasPermission(user, "teams.read")) {
      fleetLinks.push({ label: "Équipes", href: "/fleet/teams" });
    }
    if (hasPermission(user, "fleet.technicians.read")) {
      fleetLinks.push({ label: "Techniciens", href: "/fleet/technicians" });
    }
    if (hasPermission(user, "fleet.vehicles.read")) {
      fleetLinks.push({ label: "Véhicules", href: "/fleet/vehicles" });
    }
    if (hasPermission(user, "agences.read")) {
      fleetLinks.push({ label: "Agences", href: "/fleet/agences" });
    }
    if (fleetLinks.length > 0) {
      menuSections.push({ label: "Gestion", links: fleetLinks });
    }

    if (hasPermission(user, "users.read")) {
      menuSections.push({
        label: "Utilisateurs",
        links: [{ label: "Gérer les utilisateurs", href: "/users" }]
      });
    }

    const settingsLinks: MenuLink[] = [];
    if (hasPermission(user, "stock.articles.read")) {
      settingsLinks.push({ label: "Catalogue articles", href: "/settings/stock/articles" });
    }
    if (hasPermission(user, "case_templates.read")) {
      settingsLinks.push({ label: "Modèles de dossier", href: "/settings/case-templates" });
    }
    if (hasPermission(user, "profiles.read")) {
      settingsLinks.push({ label: "Permissions", href: "/settings/permissions" });
      settingsLinks.push({ label: "Profils", href: "/settings/profiles" });
    }
    if (settingsLinks.length > 0) {
      menuSections.push({ label: "Paramètres", links: settingsLinks });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden -ml-1 rounded-md p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
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
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  CRM des opérations terrain
                </div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = searchQuery.trim();
                if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
              }}
              className="relative hidden sm:block"
            >
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher…"
                className="w-48 lg:w-64 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 py-1.5 pl-8 pr-3 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              />
            </form>
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">{user?.name ?? user?.email}</span>
              <span className="rounded-full bg-brand-600/10 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                {user?.role === "admin" ? "Administrateur" : "Membre"}
              </span>
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <OrganizationSwitcher />
          <SidebarContent menuSections={menuSections} pathname={pathname} />
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="absolute top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 shadow-xl overflow-y-auto border-r border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold text-sm">
                  S
                </span>
                <div>
                  <div className="font-semibold text-sm leading-tight">Syncora</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Espace organisation</div>
                </div>
              </div>
              <OrganizationSwitcher />
              <SidebarContent
                menuSections={menuSections}
                pathname={pathname}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
