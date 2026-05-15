"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import * as notificationsApi from "@/lib/notifications.api";
import type { NotificationResponse, NotificationEntityType, NotificationAction } from "@syncora/shared";

const ENTITY_TYPE_LABELS: Record<NotificationEntityType, string> = {
  case: "Dossier",
  intervention: "Intervention",
  case_template: "Modèle de dossier",
  customer: "Client",
  vehicle: "Véhicule",
  technician: "Technicien",
  team: "Équipe",
  agence: "Agence",
  article: "Article",
  stock_movement: "Mouvement de stock",
  organization: "Organisation",
  user: "Utilisateur",
  permission_profile: "Profil de permission",
  document: "Document"
};

const ACTION_LABELS: Record<NotificationAction, string> = {
  created: "créé",
  updated: "modifié",
  deleted: "supprimé"
};

function getEntityRoute(entityType: NotificationEntityType, entityId: string): string | null {
  switch (entityType) {
    case "case":
      return `/cases/${entityId}`;
    case "customer":
      return `/customers/${entityId}`;
    case "vehicle":
      return `/fleet/vehicles/${entityId}`;
    case "technician":
      return `/fleet/technicians/${entityId}`;
    case "team":
      return `/fleet/teams/${entityId}`;
    case "agence":
      return `/fleet/agences/${entityId}`;
    case "article":
      return `/settings/stock/articles`;
    case "case_template":
      return `/settings/case-templates`;
    case "organization":
      return `/organization`;
    case "user":
      return `/users`;
    default:
      return null;
  }
}

function formatNotificationText(n: NotificationResponse): string {
  const actor = n.actorName ?? "Quelqu'un";
  const entityType = ENTITY_TYPE_LABELS[n.entityType] ?? n.entityType;
  const action = ACTION_LABELS[n.action] ?? n.action;
  const label = n.entityLabel ? ` « ${n.entityLabel} »` : "";
  return `${actor} a ${action} ${entityType.toLowerCase()}${label}`;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30_000,
    enabled: !!user
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationsApi.listNotifications(50),
    refetchInterval: 30_000,
    enabled: !!user && open
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const unreadCount = countData?.count ?? 0;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleNotificationClick = useCallback(
    (n: NotificationResponse) => {
      if (!n.read) {
        markReadMutation.mutate(n.id);
      }
      const route = getEntityRoute(n.entityType, n.entityId);
      if (route) {
        router.push(route);
        setOpen(false);
      }
    },
    [markReadMutation, router]
  );

  if (!user) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            className={
              unreadCount > 99
                ? "pointer-events-none absolute -right-0.5 -top-0.5 z-10 inline-flex h-5 min-w-[1.625rem] items-center justify-center whitespace-nowrap rounded-full bg-brand-600 px-1 text-[9px] font-semibold tabular-nums leading-tight text-white shadow-sm ring-2 ring-white dark:ring-slate-800"
                : "pointer-events-none absolute -right-0.5 -top-0.5 z-10 inline-flex h-5 min-w-5 items-center justify-center whitespace-nowrap rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold tabular-nums leading-none text-white shadow-sm ring-2 ring-white dark:ring-slate-800"
            }
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-96 max-h-[480px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50 flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Chargement…
              </div>
            )}

            {!isLoading && (!listData?.notifications || listData.notifications.length === 0) && (
              <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                Aucune notification
              </div>
            )}

            {!isLoading &&
              listData?.notifications?.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                    !n.read ? "bg-brand-50/50 dark:bg-brand-950/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!n.read && (
                      <span className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-brand-600" />
                    )}
                    <div className={`flex-1 min-w-0 ${n.read ? "pl-5" : ""}`}>
                      <p className={`text-sm leading-snug ${!n.read ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-600 dark:text-slate-400"}`}>
                        {formatNotificationText(n)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
