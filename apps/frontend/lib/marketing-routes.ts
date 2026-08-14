/** Chemins publics servis sur le domaine marketing (planwise.fr), hors légal. */
export const MARKETING_CONTENT_PATHS = ["/tarifs"] as const;

export type MarketingContentPath = (typeof MARKETING_CONTENT_PATHS)[number];

export function isMarketingContentPath(pathname: string): boolean {
  return (MARKETING_CONTENT_PATHS as readonly string[]).includes(pathname);
}
