/**
 * Index unique importExternalId (articles + prestations).
 */
module.exports = {
  async up(db) {
    for (const col of ["articles", "prestations"]) {
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
    for (const col of ["articles", "prestations"]) {
      try {
        await db.collection(col).dropIndex("organizationId_1_importExternalId_1");
      } catch (err) {
        const code = err && typeof err === "object" ? err.code : undefined;
        const codeName = err && typeof err === "object" ? err.codeName : undefined;
        if (code !== 27 && codeName !== "IndexNotFound") throw err;
      }
    }
  },
};
