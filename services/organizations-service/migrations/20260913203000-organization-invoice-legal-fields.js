/**
 * Schema-only: champs optionnels d’identité juridique et mentions de facture.
 * Aucun backfill — Mongoose accepte les nouveaux props ; les défauts FR s’appliquent
 * à la résolution (`resolveInvoiceMentions`), pas en base.
 */
module.exports = {
  async up() {
    // No-op : pas de transformation de documents (fields absents = defaults at resolve).
  },

  async down(db) {
    await db.collection("organizations").updateMany(
      {},
      {
        $unset: {
          legalForm: "",
          shareCapital: "",
          rcsLabel: "",
          vatNumber: "",
          invoiceMentions: "",
        },
      },
    );
  },
};
