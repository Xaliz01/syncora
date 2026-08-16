/**
 * Soft-detach sync factures : index unique partiel (detachedAt: null).
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
    const col = db.collection("integration_syncs");
    await dropIndexIgnoreMissing(col, "organizationId_1_provider_1_providerInvoiceId_1");
    await col.createIndex(
      { organizationId: 1, provider: 1, providerInvoiceId: 1 },
      {
        name: "organizationId_1_provider_1_providerInvoiceId_1",
        unique: true,
        partialFilterExpression: { detachedAt: null },
      },
    );
  },

  async down(db) {
    const col = db.collection("integration_syncs");
    await dropIndexIgnoreMissing(col, "organizationId_1_provider_1_providerInvoiceId_1");
    await col.createIndex(
      { organizationId: 1, provider: 1, providerInvoiceId: 1 },
      { name: "organizationId_1_provider_1_providerInvoiceId_1", unique: true },
    );
  },
};
