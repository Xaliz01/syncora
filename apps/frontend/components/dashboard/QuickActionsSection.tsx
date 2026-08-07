"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_QUICK_ACTIONS,
  MAX_QUICK_ACTION_BOOKMARKS,
  QUICK_ACTION_DND_MIME,
  normalizeQuickActionHref,
  normalizeQuickActions,
  quickActionIdFromHref,
  type QuickActionBookmark,
} from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { useQuickActionPageLabel } from "@/components/dashboard/QuickActionLabelContext";
import { NavigationHistoryButton } from "@/components/dashboard/NavigationHistoryDrawer";
import * as accountApi from "@/lib/account.api";

const CHIP_GAP_PX = 6; // gap-1.5
const MORE_BTN_MIN_PX = 36;

function parseDragPayload(dataTransfer: DataTransfer): { href: string; label: string } | null {
  const raw = dataTransfer.getData(QUICK_ACTION_DND_MIME) || dataTransfer.getData("text/plain");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { href?: string; label?: string };
    const href = normalizeQuickActionHref(parsed.href);
    if (!href) return null;
    const label = (parsed.label ?? "").trim() || href;
    return { href, label };
  } catch {
    const href = normalizeQuickActionHref(raw);
    return href ? { href, label: href } : null;
  }
}

export function useQuickActionsPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const prefsQueryKey = useMemo(
    () => ["account-preferences", user?.id, user?.organizationId] as const,
    [user?.id, user?.organizationId],
  );

  const { data: prefsData, isLoading } = useQuery({
    queryKey: prefsQueryKey,
    queryFn: () => accountApi.getPreferences(),
    staleTime: 60_000,
    enabled: !!user?.id && !!user?.organizationId,
  });

  const actions = useMemo(() => {
    const stored = prefsData?.preferences.quickActions;
    const normalized = normalizeQuickActions(stored);
    if (normalized) return normalized;
    return [...DEFAULT_QUICK_ACTIONS];
  }, [prefsData?.preferences.quickActions]);

  const saveMutation = useMutation({
    mutationFn: (quickActions: QuickActionBookmark[]) =>
      accountApi.updatePreferences({ quickActions }),
    onSuccess: (res) => {
      queryClient.setQueryData(prefsQueryKey, res);
    },
    onError: (err: Error) =>
      showToast(err.message || "Impossible d’enregistrer les actions rapides", "error"),
  });

  const applyOptimistic = useCallback(
    (normalized: QuickActionBookmark[]) => {
      queryClient.setQueryData(prefsQueryKey, (prev: unknown) => {
        const typed = prev as { userId: string; preferences: Record<string, unknown> } | undefined;
        if (!typed?.preferences) {
          return {
            userId: user?.id ?? "",
            preferences: { quickActions: normalized },
          };
        }
        return {
          ...typed,
          preferences: { ...typed.preferences, quickActions: normalized },
        };
      });
    },
    [queryClient, prefsQueryKey, user?.id],
  );

  const persist = useCallback(
    (next: QuickActionBookmark[]) => {
      const normalized = normalizeQuickActions(next) ?? [];
      applyOptimistic(normalized);
      saveMutation.mutate(normalized);
    },
    [applyOptimistic, saveMutation],
  );

  const persistDebouncedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistDebounced = useCallback(
    (next: QuickActionBookmark[]) => {
      const normalized = normalizeQuickActions(next) ?? [];
      applyOptimistic(normalized);
      if (persistDebouncedRef.current) clearTimeout(persistDebouncedRef.current);
      persistDebouncedRef.current = setTimeout(() => {
        saveMutation.mutate(normalized);
      }, 250);
    },
    [applyOptimistic, saveMutation],
  );

  useEffect(() => {
    return () => {
      if (persistDebouncedRef.current) clearTimeout(persistDebouncedRef.current);
    };
  }, []);

  return { user, actions, isLoading, persist, persistDebounced, isSaving: saveMutation.isPending };
}

function FavoriteChip({
  action,
  index,
  draggingId,
  showInsertBefore,
  onDragStart,
  onDragEnd,
  onDragOver,
  onRemove,
}: {
  action: QuickActionBookmark;
  index: number;
  draggingId: string | null;
  showInsertBefore: boolean;
  onDragStart: (e: React.DragEvent, action: QuickActionBookmark) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onRemove: (href: string) => void;
}) {
  return (
    <>
      {showInsertBefore && (
        <span className="h-6 w-0.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
      )}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, action)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, index)}
        className={`group relative shrink-0 inline-flex items-center ${
          draggingId === action.id ? "opacity-40" : ""
        }`}
      >
        <Link
          href={action.href}
          draggable={false}
          className={
            index === 0
              ? "rounded-md bg-brand-600 px-3 py-1.5 pr-6 text-xs font-medium text-white hover:bg-brand-500 transition"
              : "rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 pr-6 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          }
          title={action.href}
        >
          {action.label}
        </Link>
        <button
          type="button"
          aria-label={`Retirer ${action.label}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(action.href);
          }}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[10px] opacity-0 group-hover:opacity-100 focus:opacity-100 text-current/70 hover:bg-black/10 dark:hover:bg-white/10"
        >
          ×
        </button>
      </div>
    </>
  );
}

function FavoritesOverflowMenu({
  items,
  absoluteStartIndex,
  draggingId,
  insertIndex,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOverIndex,
  onDropAt,
}: {
  items: QuickActionBookmark[];
  absoluteStartIndex: number;
  draggingId: string | null;
  insertIndex: number | null;
  onRemove: (href: string) => void;
  onDragStart: (e: React.DragEvent, action: QuickActionBookmark) => void;
  onDragEnd: () => void;
  onDragOverIndex: (absoluteIndex: number) => void;
  onDropAt: (absoluteIndex: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const updateMenuPos = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
    const onReposition = () => updateMenuPos();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPos]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  const menu =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-[200] min-w-[14rem] max-w-[20rem] max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 py-1 shadow-xl"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDropAt(insertIndex);
            }}
          >
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Glisser pour réordonner
            </p>
            {items.map((action, localIndex) => {
              const absoluteIndex = absoluteStartIndex + localIndex;
              const showInsertBefore = Boolean(draggingId) && insertIndex === absoluteIndex;
              return (
                <React.Fragment key={action.id}>
                  {showInsertBefore && (
                    <div className="mx-2 my-0.5 h-0.5 rounded-full bg-brand-500" aria-hidden />
                  )}
                  <div
                    role="none"
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      onDragStart(e, action);
                    }}
                    onDragEnd={() => {
                      onDragEnd();
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = "move";
                      const rect = e.currentTarget.getBoundingClientRect();
                      const before = e.clientY < rect.top + rect.height / 2;
                      onDragOverIndex(before ? absoluteIndex : absoluteIndex + 1);
                    }}
                    className={`group flex cursor-grab active:cursor-grabbing items-center gap-1 px-1 ${
                      draggingId === action.id ? "opacity-40" : ""
                    }`}
                  >
                    <span
                      className="shrink-0 px-1 text-[10px] text-slate-300 dark:text-slate-600 select-none"
                      aria-hidden
                    >
                      ⋮⋮
                    </span>
                    <Link
                      role="menuitem"
                      href={action.href}
                      title={action.href}
                      draggable={false}
                      onClick={(e) => {
                        if (draggingId) {
                          e.preventDefault();
                          return;
                        }
                        setOpen(false);
                      }}
                      className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {action.label}
                    </Link>
                    <button
                      type="button"
                      aria-label={`Retirer ${action.label}`}
                      onClick={() => onRemove(action.href)}
                      className="shrink-0 rounded px-1.5 py-1 text-xs text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                    >
                      ×
                    </button>
                  </div>
                </React.Fragment>
              );
            })}
            {Boolean(draggingId) && insertIndex === absoluteStartIndex + items.length && (
              <div className="mx-2 my-0.5 h-0.5 rounded-full bg-brand-500" aria-hidden />
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Autres favoris (${items.length})`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onDragOver={(e) => {
          // Permet de déposer sur « ··· » pour envoyer en fin de liste visible / début overflow
          if (!draggingId) return;
          e.preventDefault();
          e.stopPropagation();
          onDragOverIndex(absoluteStartIndex);
        }}
        onDrop={(e) => {
          if (!draggingId) return;
          e.preventDefault();
          e.stopPropagation();
          onDropAt(absoluteStartIndex);
        }}
        className="inline-flex h-[30px] min-w-[36px] items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-semibold tracking-widest text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
      >
        ···
      </button>
      {menu}
    </div>
  );
}

function computeVisibleCount(widths: number[], available: number): number {
  if (widths.length === 0 || available <= 0) return 0;

  let total = 0;
  for (let i = 0; i < widths.length; i++) {
    total += widths[i]! + (i > 0 ? CHIP_GAP_PX : 0);
  }
  if (total <= available) return widths.length;

  const budget = Math.max(0, available - MORE_BTN_MIN_PX - CHIP_GAP_PX);
  let used = 0;
  let count = 0;
  for (let i = 0; i < widths.length; i++) {
    const next = used === 0 ? widths[i]! : used + CHIP_GAP_PX + widths[i]!;
    if (next > budget) break;
    used = next;
    count++;
  }
  return count;
}

/** Hook pour l’étoile (toggle favori page courante). */
export function useToggleCurrentQuickAction(href: string, resolveLabel: () => string) {
  const { actions, persist } = useQuickActionsPreferences();
  const normalized = normalizeQuickActionHref(href);
  const active = Boolean(normalized && actions.some((a) => a.href === normalized));

  const toggle = useCallback(() => {
    if (!normalized) return;
    if (active) {
      persist(actions.filter((a) => a.href !== normalized));
      return;
    }
    if (actions.length >= MAX_QUICK_ACTION_BOOKMARKS) return;
    const label = resolveLabel().trim() || normalized;
    persist([...actions, { id: quickActionIdFromHref(normalized), href: normalized, label }]);
  }, [active, actions, normalized, persist, resolveLabel]);

  return { active, toggle, canAdd: actions.length < MAX_QUICK_ACTION_BOOKMARKS };
}

function QuickActionStarButton({
  menuLinks,
}: {
  menuLinks: Array<{ href: string; label: string }>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageLabel = useQuickActionPageLabel();
  const search = searchParams?.toString();
  const href = search ? `${pathname}?${search}` : pathname;

  const resolveLabel = useCallback(() => {
    if (pageLabel) return pageLabel;
    const normalized = normalizeQuickActionHref(pathname);
    for (const link of menuLinks) {
      if (normalizeQuickActionHref(link.href) === normalized) return link.label;
    }
    if (typeof document !== "undefined") {
      const h1 = document.querySelector("main h1");
      const text = h1?.textContent?.trim();
      if (text) return text;
    }
    return pathname;
  }, [menuLinks, pageLabel, pathname]);

  const { active, toggle } = useToggleCurrentQuickAction(href, resolveLabel);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      title={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={active}
      className={`shrink-0 rounded-md p-1.5 transition ${
        active
          ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
          : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
      }`}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    </button>
  );
}

/** Barre d’actions rapides sous le header — desktop uniquement (masquée &lt; md). */
export function QuickActionsBar({
  menuLinks = [],
}: {
  menuLinks?: Array<{ href: string; label: string }>;
}) {
  const { user, actions, persist, persistDebounced } = useQuickActionsPreferences();
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(actions.length);

  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const recomputeVisible = useCallback(() => {
    const nav = navRef.current;
    const measure = measureRef.current;
    if (!nav || !measure) return;
    const chips = Array.from(measure.querySelectorAll<HTMLElement>("[data-qa-measure-chip]"));
    const widths = chips.map((el) => el.getBoundingClientRect().width);
    setVisibleCount(computeVisibleCount(widths, nav.clientWidth));
  }, []);

  useLayoutEffect(() => {
    recomputeVisible();
  }, [actions, recomputeVisible]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recomputeVisible());
    ro.observe(nav);
    window.addEventListener("resize", recomputeVisible);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recomputeVisible);
    };
  }, [recomputeVisible]);

  const addBookmark = useCallback(
    (href: string, label: string, atIndex?: number) => {
      const normalizedHref = normalizeQuickActionHref(href);
      if (!normalizedHref) return;
      if (actions.some((a) => a.href === normalizedHref)) {
        return;
      }
      if (actions.length >= MAX_QUICK_ACTION_BOOKMARKS) {
        return;
      }
      const bookmark: QuickActionBookmark = {
        id: quickActionIdFromHref(normalizedHref),
        href: normalizedHref,
        label: label.trim() || normalizedHref,
      };
      const next = [...actions];
      const idx =
        typeof atIndex === "number" ? Math.min(Math.max(0, atIndex), next.length) : next.length;
      next.splice(idx, 0, bookmark);
      persist(next);
    },
    [actions, persist],
  );

  const removeBookmark = useCallback(
    (href: string) => {
      persist(actions.filter((a) => a.href !== href));
    },
    [actions, persist],
  );

  const reorder = useCallback(
    (fromId: string, toIndex: number) => {
      const from = actions.findIndex((a) => a.id === fromId);
      if (from < 0) return;
      const next = [...actions];
      const [item] = next.splice(from, 1);
      if (!item) return;
      let target = toIndex;
      if (from < toIndex) target -= 1;
      target = Math.min(Math.max(0, target), next.length);
      next.splice(target, 0, item);
      persistDebounced(next);
    },
    [actions, persistDebounced],
  );

  const onChipDragStart = useCallback((e: React.DragEvent, action: QuickActionBookmark) => {
    setDraggingId(action.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      QUICK_ACTION_DND_MIME,
      JSON.stringify({ href: action.href, label: action.label }),
    );
    e.dataTransfer.setData("text/plain", action.href);
  }, []);

  const onChipDragEnd = useCallback(() => {
    setDraggingId(null);
    setInsertIndex(null);
    setDragOver(false);
  }, []);

  const onChipDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;
    setInsertIndex(before ? index : index + 1);
  }, []);

  const commitReorderDrop = useCallback(
    (absoluteIndex: number | null) => {
      if (!draggingId) return;
      reorder(draggingId, absoluteIndex ?? actions.length);
      setDraggingId(null);
      setInsertIndex(null);
      setDragOver(false);
    },
    [actions.length, draggingId, reorder],
  );

  if (!user) return null;

  const safeVisible = Math.min(visibleCount, actions.length);
  const visibleActions = actions.slice(0, safeVisible);
  const overflowActions = actions.slice(safeVisible);

  return (
    <div
      className={`hidden md:block border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 backdrop-blur-sm transition ${
        dragOver ? "ring-2 ring-inset ring-brand-400/60" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = draggingId ? "move" : "copy";
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOver(false);
        setInsertIndex(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const idx = insertIndex;
        setInsertIndex(null);
        if (draggingId) {
          commitReorderDrop(idx);
          return;
        }
        const payload = parseDragPayload(e.dataTransfer);
        if (payload) addBookmark(payload.href, payload.label, idx ?? undefined);
      }}
    >
      <div className="flex items-center gap-3 px-4 lg:px-6 py-2 min-h-[2.5rem]">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Favoris
        </span>
        {actions.length === 0 ? (
          <p className="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-400">
            Glissez un lien du menu ou utilisez ★ pour ajouter un favori.
          </p>
        ) : (
          <nav
            ref={navRef}
            className="relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
            aria-label="Favoris"
          >
            {/* Mesure hors flux pour calculer combien de puces tiennent */}
            <div
              ref={measureRef}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 flex items-center gap-1.5 opacity-0 -z-10"
            >
              {actions.map((action, index) => (
                <span
                  key={action.id}
                  data-qa-measure-chip
                  className={
                    index === 0
                      ? "shrink-0 rounded-md bg-brand-600 px-3 py-1.5 pr-6 text-xs font-medium text-white"
                      : "shrink-0 rounded-md border border-slate-200 px-3 py-1.5 pr-6 text-xs"
                  }
                >
                  {action.label}
                </span>
              ))}
            </div>

            {visibleActions.map((action, index) => (
              <FavoriteChip
                key={action.id}
                action={action}
                index={index}
                draggingId={draggingId}
                showInsertBefore={insertIndex === index && Boolean(draggingId)}
                onDragStart={onChipDragStart}
                onDragEnd={onChipDragEnd}
                onDragOver={onChipDragOver}
                onRemove={removeBookmark}
              />
            ))}
            {insertIndex === visibleActions.length && draggingId && (
              <span className="h-6 w-0.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
            )}
            <FavoritesOverflowMenu
              items={overflowActions}
              absoluteStartIndex={safeVisible}
              draggingId={draggingId}
              insertIndex={insertIndex}
              onRemove={removeBookmark}
              onDragStart={onChipDragStart}
              onDragEnd={onChipDragEnd}
              onDragOverIndex={setInsertIndex}
              onDropAt={commitReorderDrop}
            />
          </nav>
        )}
        <Suspense fallback={null}>
          <QuickActionStarButton menuLinks={menuLinks} />
        </Suspense>
        <NavigationHistoryButton />
      </div>
    </div>
  );
}
