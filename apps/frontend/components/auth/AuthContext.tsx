"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@syncora/shared";
import * as authApi from "@/lib/auth.api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    organizationName: string;
    adminEmail: string;
    adminPassword: string;
    adminName?: string;
  }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: authApi.getToken(),
    isReady: false
  });

  useEffect(() => {
    const token = authApi.getToken();
    if (!token) {
      setState((s) => ({ ...s, isReady: true }));
      return;
    }
    authApi
      .getMe()
      .then((user) => setState({ user, token, isReady: true }))
      .catch(() => {
        authApi.clearToken();
        setState({ user: null, token: null, isReady: true });
      });
  }, []);

  const persistAuth = useCallback((accessToken: string, user: AuthUser) => {
    authApi.setToken(accessToken);
    setState({ user, token: accessToken, isReady: true });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken, user } = await authApi.login(email, password);
      persistAuth(accessToken, user);
    },
    [persistAuth]
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
    },
    [persistAuth]
  );

  const logout = useCallback(() => {
    authApi.clearToken();
    setState({ user: null, token: null, isReady: true });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isReady: state.isReady || true,
      isAuthenticated: !!state.token && !!state.user,
      login,
      register,
      logout
    }),
    [state, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
