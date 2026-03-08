"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

interface ToastPayload {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_LIFETIME_MS = 2000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((previous) => [...previous, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, TOAST_LIFETIME_MS);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
        <div className="space-y-2">
        {toasts.map((toast) => {
          const style =
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : toast.type === "info"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700";
          return (
            <div
              key={toast.id}
              className={`min-w-[260px] rounded-lg border px-4 py-2 text-center text-sm shadow-md ${style}`}
              role="status"
            >
              {toast.message}
            </div>
          );
        })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
