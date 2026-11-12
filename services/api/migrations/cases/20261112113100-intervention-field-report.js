/**
 * Compte-rendu confirmé sur l'intervention (`fieldReport`, `fieldReportConfirmedAt`).
 * Champs optionnels : pas de backfill. Le down retire les valeurs confirmées.
 */
module.exports = {
  async up() {
    // Mongoose écrit les champs à la confirmation. Aucun document existant à transformer.
  },

  async down(db) {
    await db.collection("interventions").updateMany(
      {},
      { $unset: { fieldReport: "", fieldReportConfirmedAt: "" } },
    );
  },
};
