"use client";

import { useEffect } from "react";

/**
 * Remplace le layout racine en cas d'erreur fatale (doit inclure html/body).
 * Styles inline : le CSS de l'app peut ne plus être disponible.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4338ca" />
        <title>Planwise — Maintenance</title>
        <style>{`
          :root { color-scheme: light dark; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4rem 1rem;
            background: #f8fafc;
            color: #0f172a;
            position: relative;
            overflow: hidden;
          }
          @media (prefers-color-scheme: dark) {
            body { background: #020617; color: #f1f5f9; }
          }
          .glow {
            pointer-events: none;
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at top, rgba(67, 56, 202, 0.18), transparent 55%);
          }
          main {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 28rem;
            text-align: center;
          }
          .mark {
            display: inline-flex;
            width: 3.5rem;
            height: 3.5rem;
            align-items: center;
            justify-content: center;
            border-radius: 1rem;
            background: #4338ca;
            color: #fff;
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            box-shadow: 0 10px 24px rgba(67, 56, 202, 0.3);
          }
          .brand {
            margin: 0 0 0.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: #4338ca;
          }
          h1 {
            margin: 0;
            font-size: clamp(1.5rem, 4vw, 1.875rem);
            font-weight: 600;
            letter-spacing: -0.02em;
          }
          p {
            margin: 0.75rem 0 0;
            font-size: 1rem;
            line-height: 1.6;
            color: #64748b;
          }
          @media (prefers-color-scheme: dark) {
            p { color: #94a3b8; }
          }
          button {
            margin-top: 2rem;
            appearance: none;
            border: 0;
            border-radius: 0.5rem;
            background: #4338ca;
            color: #fff;
            font: inherit;
            font-size: 0.875rem;
            font-weight: 600;
            padding: 0.625rem 1.25rem;
            cursor: pointer;
          }
          button:hover { background: #4f46e5; }
        `}</style>
      </head>
      <body>
        <div className="glow" aria-hidden="true" />
        <main>
          <div className="mark" aria-hidden="true">
            P
          </div>
          <p className="brand">Planwise</p>
          <h1>Maintenance en cours</h1>
          <p>
            Planwise est temporairement indisponible pour maintenance. Merci de réessayer dans
            quelques instants.
          </p>
          <button type="button" onClick={() => reset()}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
