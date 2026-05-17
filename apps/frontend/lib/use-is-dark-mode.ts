"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onStoreChange);
  return () => {
    observer.disconnect();
    mq.removeEventListener("change", onStoreChange);
  };
}

function readDarkFromDom(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function getSnapshot(): boolean {
  return readDarkFromDom();
}

function getServerSnapshot(): boolean {
  return false;
}

/** Thème sombre : classe `dark` sur `<html>` (next-themes) + repli `resolvedTheme`. */
export function useIsDarkMode(): boolean {
  const { resolvedTheme } = useTheme();
  const fromDom = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return fromDom || resolvedTheme === "dark";
}
