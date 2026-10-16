/**
 * Index unique importExternalId (cases + interventions).
 */
module.exports = {
  async up(db) {
    for (const col of ["cases", "interventions"]) {
      await db.collection(col).createIndex(
        { organizationId: 1, importExternalId: 1 },
        {
          name: "organizationId_1_importExternalId_1",
          unique: true,
          partialFilterExpression: {
            deletedAt: null,
            importExternalId: { $type: "string" },
          },
        },
      );
    }
  },

  async down(db) {
    for (const col of ["cases", "interventions"]) {
      try {
        await db.collection(col).dropIndex("organizationId_1_importExternalId_1");
      } catch (err) {
        const code = err && typeof err === "object" ? err.code : undefined;
        const codeName = err && typeof err === "object" ? err.codeName : undefined;
        if (code !== 27 && code !== 26 && codeName !== "IndexNotFound" && codeName !== "NamespaceNotFound") throw err;
      }
    }
  },
};
