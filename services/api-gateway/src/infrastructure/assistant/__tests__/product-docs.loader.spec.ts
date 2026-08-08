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

  it("relie devis / facture au parcours facturation via synonymes", () => {
    const chunks = retrieveProductChunks("comment faire un devis pour mon client");
    expect(chunks.some((c) => c.id === "journey-billing")).toBe(true);
  });

  it("booste le parcours ma journée selon le pathname", () => {
    const chunks = retrieveProductChunks("comment démarrer", 6, "/my-day");
    expect(chunks.some((c) => c.id === "journey-my-day")).toBe(true);
  });

  it("inclut souvent les règles assistant dans le contexte", () => {
    const chunks = retrieveProductChunks("comment créer un client");
    expect(chunks.some((c) => c.id === "rules" || c.id === "journey-client")).toBe(true);
  });

  it("remonte l'assignation technicien pour assigner un utilisateur sur une intervention", () => {
    const chunks = retrieveProductChunks(
      "Comment un utilisateur peut être assigné sur une intervention ?",
    );
    expect(chunks.some((c) => c.id === "journey-assign-intervention")).toBe(true);
  });

  it("remonte devis/facturation pour une question sur facturer", () => {
    const chunks = retrieveProductChunks("Est-ce possible de facturer ?");
    expect(chunks.some((c) => c.id === "journey-billing" || c.id === "journey-integrations")).toBe(
      true,
    );
  });

  it("remonte les favoris Planwise pour une question sur les favoris", () => {
    const chunks = retrieveProductChunks("Est-ce possible de mettre une page en favori ?");
    expect(chunks.some((c) => c.id === "journey-favorites")).toBe(true);
  });

  it("remonte les contrats pour une question de maintenance", () => {
    const chunks = retrieveProductChunks("Comment créer un contrat de maintenance auto-planifié ?");
    expect(chunks.some((c) => c.id === "journey-contracts")).toBe(true);
  });

  it("remonte la démo essai pour injecter des données", () => {
    const chunks = retrieveProductChunks("Comment charger les données de démo pendant l'essai ?");
    expect(chunks.some((c) => c.id === "journey-onboarding-demo")).toBe(true);
  });

  it("remonte le stock pour les mouvements d'articles", () => {
    const chunks = retrieveProductChunks("Où gérer les mouvements de stock et les emplacements ?");
    expect(chunks.some((c) => c.id === "journey-stock")).toBe(true);
  });

  it("remonte le reporting pour le rapport kilométrique", () => {
    const chunks = retrieveProductChunks("Où voir le rapport kilométrique et CO2 ?");
    expect(chunks.some((c) => c.id === "journey-reporting")).toBe(true);
  });

  it("remonte l'abonnement pour une question de tarif", () => {
    const chunks = retrieveProductChunks(
      "Quel est le prix de l'abonnement Essentiel et des addons ?",
    );
    expect(chunks.some((c) => c.id === "journey-subscription")).toBe(true);
  });

  it("remonte l'historique de navigation", () => {
    const chunks = retrieveProductChunks(
      "Où trouver l'historique de navigation des pages récentes ?",
    );
    expect(chunks.some((c) => c.id === "journey-nav-history" || c.id === "journey-favorites")).toBe(
      true,
    );
  });

  it("remonte le quota documents pour une limite de fichiers", () => {
    const chunks = retrieveProductChunks(
      "Ai-je un nombre limité de documents que je peux déposer ?",
    );
    expect(chunks.some((c) => c.id === "journey-document-storage")).toBe(true);
  });
});
