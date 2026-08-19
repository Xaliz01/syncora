"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { SidebarNavIcon } from "@/components/layout/sidebar-nav-icons";
import { readSidebarCollapsed, writeSidebarCollapsed } from "@/lib/sidebar-preference";
import { notifySidebarPreferenceChanged, USER_PREFERENCES_APPLIED } from "@/lib/user-preferences";
import * as accountApi from "@/lib/account.api";
import type { SidebarPreference } from "@planwise/shared";
import { QUICK_ACTION_DND_MIME } from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { hasActiveSubscriptionAccess } from "@/lib/subscription-access";
import { OrganizationSwitcher } from "@/components/organization/OrganizationSwitcher";
import { hasAnyPermission, hasPermission } from "@/lib/auth-permissions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LANDING_TAGLINE } from "@/lib/landing-copy";
import { PLANWISE_LOGO_SRC } from "@/lib/brand-assets";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CrispHelpButton } from "@/components/support/CrispHelpButton";
import { AssistantButton } from "@/components/assistant/AssistantDrawer";
import { SetupGuideHost } from "@/components/onboarding/SetupGuideHost";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsSection";
import { QuickActionLabelProvider } from "@/components/dashboard/QuickActionLabelContext";
import { NavigationHistoryTracker } from "@/components/dashboard/NavigationHistoryTracker";
import { appVersionLabel, APP_VERSION } from "@/lib/app-version";

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
  if (href === "/my-day") return currentPath === "/my-day";
  if (href === "/users") {
    return currentPath === "/users" || currentPath.startsWith("/users/");
  }
  if (href === "/cases") {
    return (
      currentPath === "/cases" ||
      (currentPath.startsWith("/cases/") && !currentPath.startsWith("/cases/calendar"))
    );
  }
  if (href === "/customers") {
    return currentPath === "/customers" || currentPath.startsWith("/customers/");
  }
  if (href === "/order-givers") {
    return currentPath === "/order-givers" || currentPath.startsWith("/order-givers/");
  }
  if (href === "/organization") {
    return currentPath === "/organization" || currentPath.startsWith("/organization/");
  }
  if (href === "/subscription") {
    return currentPath === "/subscription" || currentPath.startsWith("/subscription/");
  }
  if (href === "/account") {
    return currentPath === "/account" || currentPath.startsWith("/account/");
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  currentPath,
  collapsed,
  onClick,
  allowDrag = false,
}: {
  href: string;
  label: string;
  currentPath: string;
  collapsed?: boolean;
  onClick?: () => void;
  allowDrag?: boolean;
}) {
  const isActive = isLinkActive(currentPath, href);
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : allowDrag ? `${label} — glisser vers Actions rapides` : undefined}
      draggable={allowDrag}
      onDragStart={
        allowDrag
          ? (e) => {
              e.dataTransfer.effectAllowed = "copy";
              const payload = JSON.stringify({ href, label });
              e.dataTransfer.setData(QUICK_ACTION_DND_MIME, payload);
              e.dataTransfer.setData("text/plain", payload);
            }
          : undefined
      }
      className={`flex items-center rounded-md text-sm transition ${
        collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
      } ${
        isActive
          ? "bg-brand-600/10 text-brand-600 dark:text-brand-400 font-medium"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
      } ${allowDrag ? "active:cursor-grabbing" : ""}`}
    >
      <SidebarNavIcon href={href} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SidebarCollapseToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={collapsed ? "Agrandir le menu" : "Réduire le menu"}
      aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
      className={`flex w-full shrink-0 items-center border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition ${
        collapsed ? "justify-center p-3" : "gap-2 px-3 py-2.5"
      }`}
    >
      <svg
        className="h-5 w-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        {collapsed ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        )}
      </svg>
      {!collapsed && <span className="text-xs font-medium">Réduire le menu</span>}
    </button>
  );
}

function SidebarContent({
  menuSections,
  pathname,
  collapsed,
  onNavigate,
  allowDrag = false,
}: {
  menuSections: MenuSection[];
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  allowDrag?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <nav className={`flex-1 space-y-5 py-4 ${collapsed ? "px-2" : "px-3"}`}>
        {menuSections.map((section, index) => (
          <section
            key={section.label}
            className={
              collapsed && index > 0 ? "pt-4 border-t border-slate-100 dark:border-slate-800" : ""
            }
          >
            {!collapsed && (
              <h2 className="mb-1.5 px-3 text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                {section.label}
              </h2>
            )}
            <div className="space-y-0.5">
              {section.links.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  currentPath={pathname}
                  collapsed={collapsed}
                  onClick={onNavigate}
                  allowDrag={allowDrag}
                />
              ))}
            </div>
          </section>
        ))}
      </nav>
      <div
        className={`border-t border-slate-100 dark:border-slate-800 py-3 text-center text-[11px] text-slate-400 dark:text-slate-500 ${
          collapsed ? "px-2" : "px-3"
        }`}
        title={`Planwise ${appVersionLabel()}`}
      >
        {collapsed ? APP_VERSION : `Planwise ${appVersionLabel()}`}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPrefReady, setSidebarPrefReady] = useState(false);
  const sidebarCollapsedRef = useRef(sidebarCollapsed);
  sidebarCollapsedRef.current = sidebarCollapsed;
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const subscriptionOk = hasActiveSubscriptionAccess(user);

  useEffect(() => {
    setSidebarCollapsed(readSidebarCollapsed());
    setSidebarPrefReady(true);
    const onPreferencesApplied = () => setSidebarCollapsed(readSidebarCollapsed());
    window.addEventListener(USER_PREFERENCES_APPLIED, onPreferencesApplied);
    return () => window.removeEventListener(USER_PREFERENCES_APPLIED, onPreferencesApplied);
  }, []);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    mobileSearchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  useEffect(() => {
    setMobileSearchOpen(false);
  }, [pathname]);

  const submitSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      setMobileSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    },
    [router, searchQuery],
  );
  const toggleSidebarCollapsed = useCallback(() => {
    const next = !sidebarCollapsedRef.current;
    setSidebarCollapsed(next);
    writeSidebarCollapsed(next);
    const sidebarPreference: SidebarPreference = next ? "collapsed" : "expanded";
    notifySidebarPreferenceChanged(sidebarPreference);
    if (user) {
      void accountApi.updatePreferences({ sidebarCollapsed: sidebarPreference }).catch(() => {
        /* localStorage déjà à jour */
      });
    }
  }, [user]);

  const menuSections: MenuSection[] = subscriptionOk
    ? [
        {
          label: "Général",
          links: [
            { label: "Tableau de bord", href: "/" },
            ...(user
              ? [
                  { label: "Mon organisation", href: "/organization" },
                  { label: "Mon abonnement", href: "/subscription" },
                  { label: "Mon compte", href: "/account" },
                ]
              : []),
          ],
        },
        {
          label: "Suivi",
          links: [
            ...(hasPermission(user, "interventions.read")
              ? [{ label: "Ma journée", href: "/my-day" }]
              : []),
            ...(hasPermission(user, "cases.read") ? [{ label: "Dossiers", href: "/cases" }] : []),
            ...(hasPermission(user, "contracts.read")
              ? [{ label: "Contrats", href: "/contracts" }]
              : []),
            ...(hasPermission(user, "cases.read")
              ? [{ label: "Planning", href: "/cases/calendar" }]
              : []),
            ...(hasPermission(user, "stock.movements.read")
              ? [{ label: "Mouvements de stock", href: "/stock" }]
              : []),
            ...(hasPermission(user, "exports.reporting")
              ? [{ label: "Reporting", href: "/reporting" }]
              : []),
            ...(hasPermission(user, "exports.billing")
              ? [{ label: "Facturation", href: "/billing" }]
              : []),
          ],
        },
      ]
    : [
        {
          label: "Abonnement",
          links: user
            ? [
                { label: "Mon organisation", href: "/organization" },
                { label: "Mon abonnement", href: "/subscription" },
                { label: "Mon compte", href: "/account" },
              ]
            : [],
        },
      ];
  if (subscriptionOk && user) {
    const fleetLinks: MenuLink[] = [];
    if (hasPermission(user, "customers.read")) {
      fleetLinks.push({ label: "Clients", href: "/customers" });
    }
    if (hasPermission(user, "order_givers.read")) {
      fleetLinks.push({ label: "Donneurs d'ordre", href: "/order-givers" });
    }
    if (hasPermission(user, "users.read")) {
      fleetLinks.push({ label: "Utilisateurs", href: "/users" });
    }
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

    const settingsLinks: MenuLink[] = [];
    if (hasPermission(user, "stock.articles.read")) {
      settingsLinks.push({ label: "Catalogue articles", href: "/settings/stock/articles" });
    }
    if (hasPermission(user, "prestations.read")) {
      settingsLinks.push({ label: "Prestations", href: "/settings/prestations" });
    }
    if (hasPermission(user, "stock.locations.read")) {
      settingsLinks.push({ label: "Emplacements de stock", href: "/settings/stock/locations" });
    }
    if (hasPermission(user, "case_templates.read")) {
      settingsLinks.push({ label: "Modèles de dossier", href: "/settings/case-templates" });
    }
    if (hasPermission(user, "intervention_types.read")) {
      settingsLinks.push({ label: "Types d’intervention", href: "/settings/intervention-types" });
    }
    if (hasPermission(user, "profiles.read")) {
      settingsLinks.push({ label: "Profils", href: "/settings/profiles" });
    }
    if (hasPermission(user, "notifications.manage_preferences")) {
      settingsLinks.push({ label: "Notifications", href: "/settings/notifications" });
    }
    if (hasAnyPermission(user, ["integrations.pennylane.read", "integrations.qonto.read"])) {
      settingsLinks.push({ label: "Intégrations", href: "/settings/integrations" });
    }
    if (hasPermission(user, "data_import.read")) {
      settingsLinks.push({ label: "Import de données", href: "/settings/data-import" });
    }
    if (settingsLinks.length > 0) {
      menuSections.push({ label: "Paramètres", links: settingsLinks });
    }
  }

  const visibleSections = menuSections.filter((s) => s.links.length > 0);
  const menuLinks = visibleSections.flatMap((s) => s.links);

  return (
    <QuickActionLabelProvider>
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
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
              <Link href="/" className="flex items-center gap-2.5">
                <Image
                  src={PLANWISE_LOGO_SRC}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-lg shrink-0"
                  priority
                />
                <div className="hidden sm:block">
                  <div className="font-semibold text-sm leading-tight">Planwise</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {LANDING_TAGLINE}
                  </div>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="sm:hidden -mr-0.5 rounded-md p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Rechercher"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </button>
              <form onSubmit={submitSearch} className="relative hidden sm:block">
                <svg
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-48 lg:w-64 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 py-1.5 pl-8 pr-3 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </form>
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">Bonjour, {user?.name ?? user?.email}</span>
                <span className="rounded-full bg-brand-600/10 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                  {user?.role === "admin" ? "Administrateur" : "Membre"}
                </span>
              </div>
              <NotificationBell />
              <AssistantButton />
              <CrispHelpButton />
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                title="Déconnexion"
                aria-label="Déconnexion"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition md:h-auto md:w-auto md:gap-1.5 md:px-3 md:py-1.5"
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                  />
                </svg>
                <span className="hidden text-xs font-medium md:inline">Déconnexion</span>
              </button>
            </div>
          </div>
          {mobileSearchOpen && (
            <div className="sm:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-2.5">
              <form onSubmit={submitSearch} className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <svg
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                  <input
                    ref={mobileSearchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setMobileSearchOpen(false);
                    }}
                    placeholder="Rechercher…"
                    aria-label="Rechercher"
                    className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 py-2 pl-8 pr-3 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(false)}
                  className="shrink-0 rounded-md px-2.5 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Fermer
                </button>
              </form>
            </div>
          )}
        </header>

        <div className="flex flex-1">
          {/* Desktop sidebar */}
          <aside
            className={`hidden lg:flex lg:flex-col lg:flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto overflow-x-hidden transition-[width] duration-200 ${
              sidebarPrefReady && sidebarCollapsed ? "lg:w-[4.5rem]" : "lg:w-[260px]"
            }`}
          >
            <SidebarCollapseToggle collapsed={sidebarCollapsed} onToggle={toggleSidebarCollapsed} />
            <OrganizationSwitcher collapsed={sidebarCollapsed} />
            <SidebarContent
              menuSections={visibleSections}
              pathname={pathname}
              collapsed={sidebarCollapsed}
              allowDrag
            />
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
                  <Image
                    src={PLANWISE_LOGO_SRC}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-lg shrink-0"
                  />
                  <div>
                    <div className="font-semibold text-sm leading-tight">Planwise</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Espace organisation
                    </div>
                  </div>
                </div>
                <OrganizationSwitcher />
                <SidebarContent
                  menuSections={visibleSections}
                  pathname={pathname}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </aside>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            {subscriptionOk ? (
              <div className="sticky top-[57px] z-20">
                <QuickActionsBar menuLinks={menuLinks} />
              </div>
            ) : null}
            <main className="flex-1 min-w-0 p-4 pb-20 sm:p-6 sm:pb-24 lg:p-8 lg:pb-24">
              <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
            </main>
          </div>
        </div>
        <SetupGuideHost />
        {subscriptionOk ? (
          <Suspense fallback={null}>
            <NavigationHistoryTracker menuLinks={menuLinks} />
          </Suspense>
        ) : null}
      </div>
    </QuickActionLabelProvider>
  );
}
