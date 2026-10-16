/**
 * Index unique du compteur de numéros de dossier (créations parallèles).
 */
module.exports = {
  async up(db) {
    await db.collection("case_number_counters").createIndex(
      { organizationId: 1, year: 1 },
      { name: "organizationId_1_year_1", unique: true },
    );
  },

  async down(db) {
    try {
      await db.collection("case_number_counters").dropIndex("organizationId_1_year_1");
    } catch (err) {
      const code = err && typeof err === "object" ? err.code : undefined;
      const codeName = err && typeof err === "object" ? err.codeName : undefined;
      if (
        code !== 27 &&
        code !== 26 &&
        codeName !== "IndexNotFound" &&
        codeName !== "NamespaceNotFound"
      ) {
        throw err;
      }
    }
  },
};
