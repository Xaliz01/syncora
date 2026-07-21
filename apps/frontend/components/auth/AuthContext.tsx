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
import type { AuthUser, CreateOrganizationBody, OnboardingUser } from "@planwise/shared";
import * as authApi from "@/lib/auth.api";
import * as accountApi from "@/lib/account.api";
import { applyUserPreferences } from "@/lib/user-preferences";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  onboardingUser: OnboardingUser | null;
  onboardingToken: string | null;
  isReady: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<AuthUser | "onboarding">;
  registerAccount: (payload: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<OnboardingUser>;
  completeOrganization: (payload: CreateOrganizationBody) => Promise<AuthUser>;
  acceptInvitation: (payload: {
    invitationToken: string;
    password: string;
    name?: string;
  }) => Promise<AuthUser>;
  refreshSession: () => Promise<void>;
  createOrganization: (payload: CreateOrganizationBody) => Promise<AuthUser>;
  switchOrganization: (organizationId: string) => Promise<AuthUser>;
  /** Démarre une session client depuis le backoffice (token déjà obtenu). */
  enterImpersonationSession: (accessToken: string, user: AuthUser) => void;
  /** Quitte le mode support et revient au token plateforme. */
  endImpersonationSession: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  isOnboarding: boolean;
  isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();
  const setThemeRef = useRef(setTheme);
  setThemeRef.current = setTheme;
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    onboardingUser: null,
    onboardingToken: null,
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
    const accessToken = authApi.getToken();
    if (accessToken) {
      authApi
        .getMe()
        .then(async (user) => {
          setState({
            user,
            token: accessToken,
            onboardingUser: null,
            onboardingToken: null,
            isReady: true,
          });
          await syncUserPreferences();
        })
        .catch(() => {
          authApi.clearToken();
          setState({
            user: null,
            token: null,
            onboardingUser: null,
            onboardingToken: null,
            isReady: true,
          });
        });
      return;
    }

    const onboardingToken = authApi.getOnboardingTokenFromStorage();
    if (onboardingToken) {
      authApi
        .getOnboardingMe()
        .then((onboardingUser) => {
          setState({
            user: null,
            token: null,
            onboardingUser,
            onboardingToken,
            isReady: true,
          });
        })
        .catch(() => {
          authApi.clearToken();
          setState({
            user: null,
            token: null,
            onboardingUser: null,
            onboardingToken: null,
            isReady: true,
          });
        });
      return;
    }

    setState({
      user: null,
      token: null,
      onboardingUser: null,
      onboardingToken: null,
      isReady: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap session une fois au montage
  }, []);

  const persistAuth = useCallback(
    (accessToken: string, user: AuthUser) => {
      authApi.setToken(accessToken);
      setState({
        user,
        token: accessToken,
        onboardingUser: null,
        onboardingToken: null,
        isReady: true,
      });
      void syncUserPreferences();
    },
    [syncUserPreferences],
  );

  const persistOnboarding = useCallback((accessToken: string, user: OnboardingUser) => {
    authApi.setOnboardingToken(accessToken);
    setState({
      user: null,
      token: null,
      onboardingUser: user,
      onboardingToken: accessToken,
      isReady: true,
    });
  }, []);

  const refreshSession = useCallback(async () => {
    const token = authApi.getToken();
    if (!token) return;
    try {
      const user = await authApi.getMe();
      setState((prev) => ({ ...prev, user }));
    } catch {
      authApi.clearToken();
      setState({
        user: null,
        token: null,
        onboardingUser: null,
        onboardingToken: null,
        isReady: true,
      });
    }
  }, []);

  const createOrganization = useCallback(
    async (payload: CreateOrganizationBody) => {
      const { accessToken, user } = await authApi.createOrganizationAsMember(payload);
      persistAuth(accessToken, user);
      return user;
    },
    [persistAuth],
  );

  const completeOrganization = useCallback(
    async (payload: CreateOrganizationBody) => {
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
      const result = await authApi.login(email, password);
      if (authApi.isAuthUser(result.user)) {
        persistAuth(result.accessToken, result.user);
        return result.user;
      }
      persistOnboarding(result.accessToken, result.user);
      return "onboarding" as const;
    },
    [persistAuth, persistOnboarding],
  );

  const registerAccount = useCallback(
    async (payload: { email: string; password: string; name?: string }) => {
      const result = await authApi.registerAccount(payload);
      persistOnboarding(result.accessToken, result.user);
      return result.user;
    },
    [persistOnboarding],
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
    setState({
      user: null,
      token: null,
      onboardingUser: null,
      onboardingToken: null,
      isReady: true,
    });
  }, []);

  const enterImpersonationSession = useCallback(
    (accessToken: string, user: AuthUser) => {
      persistAuth(accessToken, user);
    },
    [persistAuth],
  );

  const endImpersonationSession = useCallback(() => {
    authApi.clearToken();
    setState({
      user: null,
      token: null,
      onboardingUser: null,
      onboardingToken: null,
      isReady: true,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: !!state.token && !!state.user,
      isOnboarding: !!state.onboardingToken && !!state.onboardingUser,
      isImpersonating: !!state.user?.impersonatorId,
      login,
      registerAccount,
      completeOrganization,
      acceptInvitation,
      refreshSession,
      createOrganization,
      switchOrganization,
      enterImpersonationSession,
      endImpersonationSession,
      logout,
    }),
    [
      state,
      login,
      registerAccount,
      completeOrganization,
      acceptInvitation,
      refreshSession,
      createOrganization,
      switchOrganization,
      enterImpersonationSession,
      endImpersonationSession,
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
