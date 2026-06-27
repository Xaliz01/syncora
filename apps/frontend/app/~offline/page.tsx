"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-3xl font-semibold text-white">
        S
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-slate-100">Hors connexion</h1>

      <p className="mb-8 max-w-sm text-slate-400">
        Vous n&apos;êtes pas connecté à Internet. Vérifiez votre connexion et réessayez.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-brand-600 px-6 py-2.5 font-medium text-white transition hover:bg-brand-500"
      >
        Réessayer
      </button>
    </div>
  );
}
