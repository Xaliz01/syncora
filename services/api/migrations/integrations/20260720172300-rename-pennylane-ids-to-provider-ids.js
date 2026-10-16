/**
 * Rename legacy Pennylane-centric sync IDs to provider-agnostic fields.
 *
 * pennylaneCustomerId → providerCustomerId
 * pennylaneInvoiceId   → providerInvoiceId
 */
module.exports = {
  async up(db) {
    await db.collection("integration_syncs").updateMany(
      {
        pennylaneCustomerId: { $exists: true },
        providerCustomerId: { $exists: false },
      },
      {
        $rename: {
          pennylaneCustomerId: "providerCustomerId",
          pennylaneInvoiceId: "providerInvoiceId",
        },
      },
    );
  },

  async down(db) {
    await db.collection("integration_syncs").updateMany(
      {
        providerCustomerId: { $exists: true },
        pennylaneCustomerId: { $exists: false },
      },
      {
        $rename: {
          providerCustomerId: "pennylaneCustomerId",
          providerInvoiceId: "pennylaneInvoiceId",
        },
      },
    );
  },
};
