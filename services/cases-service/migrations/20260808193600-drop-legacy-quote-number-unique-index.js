/**
 * Ancien schéma : `quoteNumber` unique global (`quoteNumber_1`) → collision multi-tenant
 * (ex. DEV-2026-0001 déjà pris par une autre org).
 * Schéma actuel : unique composé (organizationId, quoteNumber) avec partialFilter soft-delete.
 */
module.exports = {
  async up(db) {
    const col = db.collection("quotes");

    try {
      await col.dropIndex("quoteNumber_1");
    } catch (err) {
      const code = err && typeof err === "object" ? err.code : undefined;
      const codeName = err && typeof err === "object" ? err.codeName : undefined;
      if (code !== 27 && codeName !== "IndexNotFound") {
        throw err;
      }
    }

    await col.createIndex(
      { organizationId: 1, quoteNumber: 1 },
      {
        name: "organizationId_1_quoteNumber_1",
        unique: true,
        partialFilterExpression: { deletedAt: null },
      },
    );
  },

  async down(db) {
    const col = db.collection("quotes");
    try {
      await col.dropIndex("organizationId_1_quoteNumber_1");
    } catch {
      // ignore
    }
    await col.createIndex({ quoteNumber: 1 }, { name: "quoteNumber_1", unique: true });
  },
};
