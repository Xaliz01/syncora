import { buildOrganizationJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo";

/** Données structurées Schema.org pour la landing marketing. */
export function MarketingJsonLd() {
  const payloads = [buildOrganizationJsonLd(), buildSoftwareApplicationJsonLd()];

  return (
    <>
      {payloads.map((payload) => (
        <script
          key={String(payload["@type"])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
        />
      ))}
    </>
  );
}
