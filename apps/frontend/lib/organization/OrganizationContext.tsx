"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrganizationResponse } from "@syncora/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import * as organizationsApi from "@/lib/organizations.api";

export interface OrganizationContextValue {
  organizations: OrganizationResponse[];
  /** Organisation du JWT — seul contexte d’accès API pour l’instant. */
  sessionOrganizationId: string;
  activeOrganization: OrganizationResponse | undefined;
  isLoading: boolean;
  refetchOrganizations: () => void;
  /** Sélection d’une autre entrée : affiche un message tant que le backend multi-org / switch n’est pas branché. */
  selectOrganization: (organizationId: string) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["organizations", "mine", user?.organizationId],
    queryFn: () => organizationsApi.listMine(),
    enabled: isReady && isAuthenticated && !!user
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
    [organizations, sessionOrganizationId]
  );

  const selectOrganization = useCallback(
    (organizationId: string) => {
      if (organizationId === sessionOrganizationId) return;
      showToast(
        "La bascule entre organisations sera disponible lorsque votre compte sera lié à plusieurs espaces."
      );
    },
    [sessionOrganizationId, showToast]
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
      refetchOrganizations,
      selectOrganization
    }),
    [
      organizations,
      sessionOrganizationId,
      activeOrganization,
      isLoading,
      refetchOrganizations,
      selectOrganization
    ]
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
}
