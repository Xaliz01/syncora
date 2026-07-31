import type { Request } from "express";
import * as geoip from "geoip-lite";

export interface ClientGeoHints {
  /** ISO 3166-1 alpha-2 (ex. FR). */
  country?: string;
  /** Code région approximatif (ex. IDF, CA). */
  region?: string;
}

function headerValue(req: Request, name: string): string | undefined {
  const raw = req.headers[name];
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return undefined;
}

/** Première IP client utile (proxy / CDN / socket). */
export function extractClientIp(req: Request): string | undefined {
  const forwarded = headerValue(req, "x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.replace(/^\[|\]$/g, "");
  }
  const realIp = headerValue(req, "x-real-ip");
  if (realIp) return realIp;

  const cfConnecting = headerValue(req, "cf-connecting-ip");
  if (cfConnecting) return cfConnecting;

  const ip = req.ip?.trim();
  if (ip) return ip.replace(/^::ffff:/, "");

  return req.socket?.remoteAddress?.replace(/^::ffff:/, "");
}

function normalizeCountry(code?: string | null): string | undefined {
  const value = (code ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value) || value === "XX" || value === "T1") return undefined;
  return value;
}

function normalizeRegion(code?: string | null): string | undefined {
  const value = (code ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
  if (!value || value.length > 10) return undefined;
  return value;
}

/**
 * Localisation approximative sans stocker l'IP :
 * 1) headers CDN/proxy (Cloudflare, CloudFront, Vercel)
 * 2) base offline geoip-lite
 */
export function resolveClientGeo(req: Request): ClientGeoHints {
  const headerCountry = normalizeCountry(
    headerValue(req, "cf-ipcountry") ??
      headerValue(req, "cloudfront-viewer-country") ??
      headerValue(req, "x-vercel-ip-country") ??
      headerValue(req, "x-country-code"),
  );
  const headerRegion = normalizeRegion(
    headerValue(req, "cloudfront-viewer-country-region") ??
      headerValue(req, "x-vercel-ip-country-region") ??
      headerValue(req, "x-region-code"),
  );

  if (headerCountry) {
    return { country: headerCountry, ...(headerRegion ? { region: headerRegion } : {}) };
  }

  const ip = extractClientIp(req);
  if (!ip || ip === "127.0.0.1" || ip === "::1") {
    return {};
  }

  try {
    const lookup = geoip.lookup(ip);
    const country = normalizeCountry(lookup?.country);
    const region = normalizeRegion(lookup?.region);
    if (!country) return {};
    return { country, ...(region ? { region } : {}) };
  } catch {
    return {};
  }
}
