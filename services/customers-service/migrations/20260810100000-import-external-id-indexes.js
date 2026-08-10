/**
 * Index unique importExternalId (customers + sites + order_givers).
 */
module.exports = {
  async up(db) {
    await db.collection("customers").createIndex(
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
    await db.collection("customers").createIndex(
      { organizationId: 1, "sites.importExternalId": 1 },
      {
        name: "organizationId_1_sites.importExternalId_1",
        unique: true,
        partialFilterExpression: {
          deletedAt: null,
          "sites.importExternalId": { $type: "string" },
        },
      },
    );
    await db.collection("order_givers").createIndex(
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
  },

  async down(db) {
    for (const [col, name] of [
      ["customers", "organizationId_1_importExternalId_1"],
      ["customers", "organizationId_1_sites.importExternalId_1"],
      ["order_givers", "organizationId_1_importExternalId_1"],
    ]) {
      try {
        await db.collection(col).dropIndex(name);
      } catch (err) {
        const code = err && typeof err === "object" ? err.code : undefined;
        const codeName = err && typeof err === "object" ? err.codeName : undefined;
        if (code !== 27 && codeName !== "IndexNotFound") throw err;
      }
    }
  },
};
