"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "next-themes";
import type { AuthUser } from "@syncora/shared";
import * as authApi from "@/lib/auth.api";
import * as accountApi from "@/lib/account.api";
import { applyUserPreferences } from "@/lib/user-preferences";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: {
    organizationName: string;
    adminEmail: string;
    adminPassword: string;
    adminName?: string;
  }) => Promise<AuthUser>;
  acceptInvitation: (payload: {
    invitationToken: string;
    password: string;
    name?: string;
  }) => Promise<AuthUser>;
  /** Recharge l’utilisateur depuis /auth/me (ex. après activation d’un abonnement). */
  refreshSession: () => Promise<void>;
  /** Crée une nouvelle organisation et positionne la session dessus (nouveau JWT). */
  createOrganization: (payload: { name: string }) => Promise<AuthUser>;
  /** Bascule vers une autre organisation déjà liée au compte (nouveau JWT). */
  switchOrganization: (organizationId: string) => Promise<AuthUser>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();
  const setThemeRef = useRef(setTheme);
  setThemeRef.current = setTheme;
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isReady: false,
  });

  const syncUserPreferences = useCallback(async () => {
    try {
      const res = await accountApi.getPreferences();
      applyUserPreferences(res.preferences, (theme) => setThemeRef.current(theme));
    } catch {
      /* préférences par défaut côté UI */
    }
  }, []);

  useEffect(() => {
    const token = authApi.getToken();
    if (!token) {
      setState({ user: null, token: null, isReady: true });
      return;
    }
    authApi
      .getMe()
      .then(async (user) => {
        setState({ user, token, isReady: true });
        await syncUserPreferences();
      })
      .catch(() => {
        authApi.clearToken();
        setState({ user: null, token: null, isReady: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap session une fois au montage
  }, []);

  const persistAuth = useCallback(
    (accessToken: string, user: AuthUser) => {
      authApi.setToken(accessToken);
      setState({ user, token: accessToken, isReady: true });
      void syncUserPreferences();
    },
    [syncUserPreferences],
  );

  const refreshSession = useCallback(async () => {
    const token = authApi.getToken();
    if (!token) return;
    try {
      const user = await authApi.getMe();
      setState((prev) => ({ ...prev, user }));
    } catch {
      authApi.clearToken();
      setState({ user: null, token: null, isReady: true });
    }
  }, []);

  const createOrganization = useCallback(
    async (payload: { name: string }) => {
      const { accessToken, user } = await authApi.createOrganization(payload);
      persistAuth(accessToken, user);
      return user;
    },
    [persistAuth],
  );

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      const { accessToken, user } = await authApi.switchOrganization({ organizationId });
      persistAuth(accessToken, user);
      return user;
    },
    [persistAuth],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken, user } = await authApi.login(email, password);
      persistAuth(accessToken, user);
      return user;
    },
    [persistAuth],
  );

  const register = useCallback(
    async (payload: {
      organizationName: string;
      adminEmail: string;
      adminPassword: string;
      adminName?: string;
    }) => {
      const { accessToken, user } = await authApi.register(payload);
      persistAuth(accessToken, user);
      return user;
    },
    [persistAuth],
  );

  const acceptInvitation = useCallback(
    async (payload: { invitationToken: string; password: string; name?: string }) => {
      const { accessToken, user } = await authApi.acceptInvitation(payload);
      persistAuth(accessToken, user);
      return user;
    },
    [persistAuth],
  );

  const logout = useCallback(() => {
    authApi.clearToken();
    setState({ user: null, token: null, isReady: true });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: !!state.token && !!state.user,
      login,
      register,
      acceptInvitation,
      refreshSession,
      createOrganization,
      switchOrganization,
      logout,
    }),
    [
      state,
      login,
      register,
      acceptInvitation,
      refreshSession,
      createOrganization,
      switchOrganization,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
