/**
 * Index pour le cron de rafraîchissement factures :
 * traite d’abord les syncs les plus anciennes (évite la famine au-delà du batch).
 */
module.exports = {
  async up(db) {
    const col = db.collection("integration_syncs");
    await col.createIndex({ lastSyncedAt: 1, _id: 1 }, { name: "lastSyncedAt_1__id_1" });
  },

  async down(db) {
    const col = db.collection("integration_syncs");
    try {
      await col.dropIndex("lastSyncedAt_1__id_1");
    } catch {
      // ignore
    }
  },
};
