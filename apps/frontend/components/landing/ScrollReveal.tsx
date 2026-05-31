"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  /** Délai avant l’animation (décalage en cascade entre cartes). */
  delayMs?: number;
  /** Déclencher à l’affichage initial (hero) plutôt qu’au scroll. */
  when?: "scroll" | "mount";
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Élément entièrement hors viewport (au-dessus ou en dessous) — permet de rejouer l’animation. */
function isFullyOutOfViewport(rect: DOMRect): boolean {
  const vh = window.innerHeight;
  return rect.bottom <= 0 || rect.top >= vh;
}

/** Aligné sur rootMargin du observer (-6 % en bas). */
function isInRevealZone(rect: DOMRect): boolean {
  const vh = window.innerHeight;
  const bottomInset = vh * 0.06;
  return rect.top < vh - bottomInset && rect.bottom > 0;
}

export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  when = "scroll",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }

    if (when === "mount") {
      const id = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(id);
    }

    const node = ref.current;
    if (!node) return;

    let cancelled = false;

    const reveal = () => {
      if (!cancelled) setVisible(true);
    };

    const hide = () => {
      if (!cancelled) setVisible(false);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry || cancelled) return;

        if (entry.isIntersecting) {
          reveal();
          return;
        }

        if (isFullyOutOfViewport(entry.boundingClientRect)) {
          hide();
        }
      },
      { threshold: [0, 0.12], rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(node);

    // Après layout : éléments déjà visibles (IO ne rappelle pas toujours au premier observe).
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled || !ref.current) return;
        if (isInRevealZone(ref.current.getBoundingClientRect())) {
          reveal();
        }
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [when]);

  return (
    <div
      ref={ref}
      className={["landing-reveal", visible && "landing-reveal--visible", className]
        .filter(Boolean)
        .join(" ")}
      style={visible && delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
