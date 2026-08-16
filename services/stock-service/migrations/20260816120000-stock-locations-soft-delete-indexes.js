/**
 * Soft-delete emplacements stock : index unique partiel (deletedAt: null).
 */
async function dropIndexIgnoreMissing(collection, indexName) {
  try {
    await collection.dropIndex(indexName);
  } catch (err) {
    const code = err && typeof err === "object" ? err.code : undefined;
    const codeName = err && typeof err === "object" ? err.codeName : undefined;
    if (code !== 27 && code !== 26 && codeName !== "IndexNotFound" && codeName !== "NamespaceNotFound") throw err;
  }
}

module.exports = {
  async up(db) {
    const col = db.collection("stock_locations");
    await dropIndexIgnoreMissing(col, "organizationId_1_name_1");
    await col.createIndex(
      { organizationId: 1, name: 1 },
      {
        name: "organizationId_1_name_1",
        unique: true,
        partialFilterExpression: { deletedAt: null },
      },
    );
  },

  async down(db) {
    const col = db.collection("stock_locations");
    await dropIndexIgnoreMissing(col, "organizationId_1_name_1");
    await col.createIndex(
      { organizationId: 1, name: 1 },
      { name: "organizationId_1_name_1", unique: true },
    );
  },
};
