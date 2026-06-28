/**
 * Version applicative et SHA Git, injectés au build de l'image frontend par la CD
 * (variables NEXT_PUBLIC_APP_VERSION / NEXT_PUBLIC_GIT_SHA). En développement local,
 * ces variables sont absentes : on retombe sur "dev".
 */
const rawVersion = process.env.NEXT_PUBLIC_APP_VERSION?.trim();
const rawSha = process.env.NEXT_PUBLIC_GIT_SHA?.trim();

export const APP_VERSION = rawVersion && rawVersion.length > 0 ? rawVersion : "dev";
export const APP_GIT_SHA = rawSha && rawSha.length > 0 ? rawSha : null;

/** Libellé compact pour l'UI, ex: "v0.1.0 · a1b2c3d" ou "dev". */
export function appVersionLabel(): string {
  if (APP_GIT_SHA && APP_GIT_SHA !== APP_VERSION) {
    return `${APP_VERSION} · ${APP_GIT_SHA}`;
  }
  return APP_VERSION;
}
