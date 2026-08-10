/**
 * Index data_import_runs (liste org + TTL 180j).
 */
module.exports = {
  async up(db) {
    await db.collection("data_import_runs").createIndex(
      { organizationId: 1, createdAt: -1 },
      { name: "organizationId_1_createdAt_-1" },
    );
    await db.collection("data_import_runs").createIndex(
      { createdAt: 1 },
      { name: "createdAt_1_ttl", expireAfterSeconds: 180 * 24 * 60 * 60 },
    );
  },

  async down(db) {
    for (const name of ["organizationId_1_createdAt_-1", "createdAt_1_ttl"]) {
      try {
        await db.collection("data_import_runs").dropIndex(name);
      } catch (err) {
        if (err?.code !== 27 && err?.codeName !== "IndexNotFound") throw err;
      }
    }
  },
};
