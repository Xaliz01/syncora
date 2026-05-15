"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrganizationResponse } from "@syncora/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { OrganizationSwitchOverlay } from "@/components/organization/OrganizationSwitchOverlay";
import { useToast } from "@/components/ui/ToastProvider";
import * as organizationsApi from "@/lib/organizations.api";

/** Durée minimale d’affichage de l’overlay pour une transition lisible (ms). */
const ORG_SWITCH_OVERLAY_MIN_MS = 520;

export interface OrganizationContextValue {
  organizations: OrganizationResponse[];
  /** Organisation du JWT — seul contexte d’accès API pour l’instant. */
  sessionOrganizationId: string;
  activeOrganization: OrganizationResponse | undefined;
  isLoading: boolean;
  /** Bascule d’organisation en cours (overlay plein écran). */
  isSwitchingOrganization: boolean;
  refetchOrganizations: () => void;
  /** Bascule vers une autre organisation (JWT mis à jour). */
  selectOrganization: (organizationId: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isReady, switchOrganization } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const switchingRef = useRef(false);
  const [switchOverlay, setSwitchOverlay] = useState<{ active: boolean; label: string | null }>({
    active: false,
    label: null,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["organizations", "mine", user?.organizationId],
    queryFn: () => organizationsApi.listMine(),
    enabled: isReady && isAuthenticated && !!user,
  });

  const sessionOrganizationId = user?.organizationId ?? "";

  const organizations = useMemo(() => {
    const list = data?.organizations ?? [];
    if (list.length > 0) return list;
    if (sessionOrganizationId) {
      return [{ id: sessionOrganizationId, name: "Organisation" }];
    }
    return [];
  }, [data?.organizations, sessionOrganizationId]);

  const activeOrganization = useMemo(
    () => organizations.find((o) => o.id === sessionOrganizationId),
    [organizations, sessionOrganizationId],
  );

  const selectOrganization = useCallback(
    async (organizationId: string) => {
      if (organizationId === sessionOrganizationId) return;
      if (switchingRef.current) return;

      switchingRef.current = true;
      const targetLabel = organizations.find((o) => o.id === organizationId)?.name ?? null;
      setSwitchOverlay({ active: true, label: targetLabel });
      const startedAt = Date.now();

      try {
        await switchOrganization(organizationId);
        /**
         * Les queryKeys ne sont pas toutes préfixées par org : sans ça, le cache garde
         * dossiers, interventions, clients, etc. de l’organisation précédente alors que
         * le JWT est déjà le bon (stocké dans localStorage au moment du switch).
         */
        await queryClient.cancelQueries();
        queryClient.clear();
        router.replace("/");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Bascule impossible.", "error");
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, ORG_SWITCH_OVERLAY_MIN_MS - elapsed);
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        setSwitchOverlay({ active: false, label: null });
        switchingRef.current = false;
      }
    },
    [organizations, sessionOrganizationId, switchOrganization, showToast, queryClient, router],
  );

  const refetchOrganizations = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["organizations", "mine"] });
    void refetch();
  }, [queryClient, refetch]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      sessionOrganizationId,
      activeOrganization,
      isLoading,
      isSwitchingOrganization: switchOverlay.active,
      refetchOrganizations,
      selectOrganization,
    }),
    [
      organizations,
      sessionOrganizationId,
      activeOrganization,
      isLoading,
      switchOverlay.active,
      refetchOrganizations,
      selectOrganization,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
      <OrganizationSwitchOverlay
        visible={switchOverlay.active}
        organizationName={switchOverlay.label}
      />
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
}
