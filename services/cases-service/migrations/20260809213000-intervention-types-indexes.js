/**
 * Collection intervention_types : index org + unique (organizationId, name) soft-delete.
 */
module.exports = {
  async up(db) {
    const col = db.collection("intervention_types");
    await col.createIndex({ organizationId: 1 }, { name: "organizationId_1" });
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
    const col = db.collection("intervention_types");
    for (const name of ["organizationId_1_name_1", "organizationId_1"]) {
      try {
        await col.dropIndex(name);
      } catch (err) {
        const code = err && typeof err === "object" ? err.code : undefined;
        const codeName = err && typeof err === "object" ? err.codeName : undefined;
        if (code !== 27 && code !== 26 && codeName !== "IndexNotFound" && codeName !== "NamespaceNotFound") throw err;
      }
    }
  },
};
