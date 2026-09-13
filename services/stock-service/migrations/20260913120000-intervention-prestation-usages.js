/**
 * Collection intervention_prestation_usages + index unique actif (org, intervention, prestation).
 */
async function dropIndexIgnoreMissing(collection, indexName) {
  try {
    await collection.dropIndex(indexName);
  } catch (err) {
    const code = err && typeof err === "object" ? err.code : undefined;
    const codeName = err && typeof err === "object" ? err.codeName : undefined;
    if (code !== 27 && code !== 26 && codeName !== "IndexNotFound" && codeName !== "NamespaceNotFound") {
      throw err;
    }
  }
}

module.exports = {
  async up(db) {
    const col = db.collection("intervention_prestation_usages");
    await dropIndexIgnoreMissing(col, "organizationId_1_interventionId_1_prestationId_1");
    await col.createIndex(
      { organizationId: 1, interventionId: 1, prestationId: 1 },
      {
        name: "organizationId_1_interventionId_1_prestationId_1",
        unique: true,
        partialFilterExpression: { deletedAt: null },
      },
    );
    await col.createIndex(
      { organizationId: 1, caseId: 1, deletedAt: 1 },
      { name: "organizationId_1_caseId_1_deletedAt_1" },
    );
    await col.createIndex(
      { organizationId: 1, interventionId: 1, deletedAt: 1 },
      { name: "organizationId_1_interventionId_1_deletedAt_1" },
    );
  },

  async down(db) {
    const col = db.collection("intervention_prestation_usages");
    await dropIndexIgnoreMissing(col, "organizationId_1_interventionId_1_prestationId_1");
    await dropIndexIgnoreMissing(col, "organizationId_1_caseId_1_deletedAt_1");
    await dropIndexIgnoreMissing(col, "organizationId_1_interventionId_1_deletedAt_1");
  },
};
