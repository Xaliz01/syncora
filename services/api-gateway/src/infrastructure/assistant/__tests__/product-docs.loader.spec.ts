import { retrieveProductChunks } from "../product-docs.loader";

describe("retrieveProductChunks", () => {
  it("remonte le chunk planning pour une question planning", () => {
    const chunks = retrieveProductChunks("où est le planning des interventions");
    expect(chunks.some((c) => c.id === "journey-planning" || c.id === "routes")).toBe(true);
  });

  it("remonte un fallback si requête vide de sens", () => {
    const chunks = retrieveProductChunks("zzzxxxqqq");
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("priorise le chunk à propos pour « qui a développé »", () => {
    const chunks = retrieveProductChunks("Qui a développé Planwise ?");
    expect(chunks[0]?.id).toBe("about");
  });
});
