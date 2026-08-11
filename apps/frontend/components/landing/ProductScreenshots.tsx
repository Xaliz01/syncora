"use client";

import type { ReactNode } from "react";
import Image from "next/image";

export const PRODUCT_SCREENSHOTS = [
  {
    id: "planning",
    src: "/marketing/screenshot-planning.jpg",
    alt: "Planning Planwise — vue semaine avec interventions et file non planifiées",
    label: "Planning interactif",
    width: 1024,
    height: 511,
    kind: "desktop" as const,
  },
  {
    id: "dossier",
    src: "/marketing/screenshot-dossier.jpg",
    alt: "Dossier Planwise — étapes, tâches et suivi client",
    label: "Fiche dossier",
    width: 1024,
    height: 510,
    kind: "desktop" as const,
  },
  {
    id: "dashboard",
    src: "/marketing/screenshot-dashboard.jpg",
    alt: "Tableau de bord Planwise — tâches, dossiers actifs et assistant guide",
    label: "Tableau de bord",
    width: 1024,
    height: 513,
    kind: "desktop" as const,
  },
  {
    id: "my-day",
    src: "/marketing/screenshot-my-day.jpg",
    alt: "Ma journée Planwise sur mobile — démarrer et terminer une intervention",
    label: "Ma journée (mobile)",
    width: 509,
    height: 1024,
    kind: "mobile" as const,
  },
] as const;

export type ProductScreenshotId = (typeof PRODUCT_SCREENSHOTS)[number]["id"];

function shotById(id: ProductScreenshotId) {
  const shot = PRODUCT_SCREENSHOTS.find((s) => s.id === id);
  if (!shot) throw new Error(`Unknown product screenshot: ${id}`);
  return shot;
}

function BrowserChrome({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 dark:shadow-black/40 ring-1 ring-slate-900/5">
      <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
        <span
          className="ml-2 h-4 flex-1 max-w-[10rem] rounded-full bg-slate-200/80 dark:bg-slate-800"
          aria-hidden
        />
      </div>
      {children}
    </div>
  );
}

function PhoneChrome({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border-[5px] border-slate-800 dark:border-slate-200 bg-slate-800 dark:bg-slate-200 shadow-2xl shadow-slate-900/25 dark:shadow-black/50">
      <div className="relative bg-black">
        <div
          className="absolute left-1/2 top-1.5 z-10 h-1 w-12 -translate-x-1/2 rounded-full bg-slate-700"
          aria-hidden
        />
        {children}
      </div>
    </div>
  );
}

/** Collage hero landing : planning + téléphone Ma journée. */
export function ProductScreenshotsHero() {
  const planning = shotById("planning");
  const myDay = shotById("my-day");

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-500/15 via-transparent to-violet-500/10 blur-2xl"
        aria-hidden
      />
      <div className="relative">
        <BrowserChrome>
          <Image
            src={planning.src}
            alt={planning.alt}
            width={planning.width}
            height={planning.height}
            className="h-auto w-full"
            sizes="(max-width: 1024px) 90vw, 520px"
            priority
          />
        </BrowserChrome>
        <div className="absolute -bottom-6 -right-2 w-[38%] max-w-[11rem] sm:-right-4 sm:w-[34%] sm:max-w-[12.5rem] rotate-[4deg]">
          <PhoneChrome>
            <Image
              src={myDay.src}
              alt={myDay.alt}
              width={myDay.width}
              height={myDay.height}
              className="h-auto w-full"
              sizes="180px"
              priority
            />
          </PhoneChrome>
        </div>
      </div>
      <p className="mt-7 text-center text-xs text-slate-500 dark:text-slate-400 sm:mt-8">
        Planning bureau · Ma journée sur mobile
      </p>
    </div>
  );
}

/** Collage register étape 1 : dossier + téléphone Ma journée. */
export function ProductScreenshotsRegister() {
  const dossier = shotById("dossier");
  const myDay = shotById("my-day");

  return (
    <div className="relative mx-auto mt-6 w-full max-w-[18rem] pb-4">
      <div className="relative">
        <BrowserChrome>
          <Image
            src={dossier.src}
            alt={dossier.alt}
            width={dossier.width}
            height={dossier.height}
            className="h-auto w-full"
            sizes="288px"
          />
        </BrowserChrome>
        <div className="absolute -bottom-3 -right-3 w-[42%] max-w-[5.75rem] rotate-[5deg] sm:-right-4 sm:max-w-[6.25rem]">
          <PhoneChrome>
            <Image
              src={myDay.src}
              alt={myDay.alt}
              width={myDay.width}
              height={myDay.height}
              className="h-auto w-full"
              sizes="100px"
            />
          </PhoneChrome>
        </div>
      </div>
    </div>
  );
}

/** Illustration compacte pour une carte / section fonctionnalité. */
export function ProductScreenshotInline({
  id,
  className = "",
}: {
  id: ProductScreenshotId;
  className?: string;
}) {
  const shot = shotById(id);
  if (shot.kind === "mobile") {
    return (
      <figure className={`mx-auto w-[min(100%,9.5rem)] ${className}`}>
        <PhoneChrome>
          <Image
            src={shot.src}
            alt={shot.alt}
            width={shot.width}
            height={shot.height}
            className="h-auto w-full"
            sizes="152px"
          />
        </PhoneChrome>
      </figure>
    );
  }
  return (
    <figure className={className}>
      <BrowserChrome>
        <Image
          src={shot.src}
          alt={shot.alt}
          width={shot.width}
          height={shot.height}
          className="h-auto w-full"
          sizes="(max-width: 768px) 90vw, 360px"
        />
      </BrowserChrome>
    </figure>
  );
}

/**
 * Décor login : captures en arrière-plan, décalées sur les côtés
 * pour ne pas être entièrement cachées par les cards.
 */
export function ProductScreenshotsLoginBackdrop() {
  const planning = shotById("planning");
  const dossier = shotById("dossier");
  const myDay = shotById("my-day");

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-[12%] top-[8%] w-[min(58%,32rem)] -rotate-[7deg] opacity-40 dark:opacity-25">
        <BrowserChrome>
          <Image
            src={planning.src}
            alt=""
            width={planning.width}
            height={planning.height}
            className="h-auto w-full"
            sizes="480px"
          />
        </BrowserChrome>
      </div>
      <div className="absolute -right-[10%] bottom-[4%] w-[min(54%,30rem)] rotate-[6deg] opacity-35 dark:opacity-22">
        <BrowserChrome>
          <Image
            src={dossier.src}
            alt=""
            width={dossier.width}
            height={dossier.height}
            className="h-auto w-full"
            sizes="440px"
          />
        </BrowserChrome>
      </div>
      <div className="absolute right-[2%] top-[14%] hidden w-[7rem] rotate-[9deg] opacity-45 dark:opacity-28 sm:block md:right-[3%] lg:w-[8rem]">
        <PhoneChrome>
          <Image
            src={myDay.src}
            alt=""
            width={myDay.width}
            height={myDay.height}
            className="h-auto w-full"
            sizes="128px"
          />
        </PhoneChrome>
      </div>
    </div>
  );
}
