/**
 * Soft-delete équipes / agences : index unique partiel (deletedAt: null).
 */
async function dropIndexIgnoreMissing(collection, indexName) {
  try {
    await collection.dropIndex(indexName);
  } catch (err) {
    const code = err && typeof err === "object" ? err.code : undefined;
    const codeName = err && typeof err === "object" ? err.codeName : undefined;
    if (code !== 27 && codeName !== "IndexNotFound") throw err;
  }
}

module.exports = {
  async up(db) {
    for (const colName of ["teams", "agences"]) {
      const col = db.collection(colName);
      await dropIndexIgnoreMissing(col, "organizationId_1_name_1");
      await col.createIndex(
        { organizationId: 1, name: 1 },
        {
          name: "organizationId_1_name_1",
          unique: true,
          partialFilterExpression: { deletedAt: null },
        },
      );
    }
  },

  async down(db) {
    for (const colName of ["teams", "agences"]) {
      const col = db.collection(colName);
      await dropIndexIgnoreMissing(col, "organizationId_1_name_1");
      await col.createIndex(
        { organizationId: 1, name: 1 },
        { name: "organizationId_1_name_1", unique: true },
      );
    }
  },
};
