/**
 * Remplace l’unicité 1 facture / dossier×provider par 1-n (unicité sur la facture distante).
 * Initialise invoiceKind=full sur les documents existants.
 */
module.exports = {
  async up(db) {
    const col = db.collection("integration_syncs");
    try {
      await col.dropIndex("organizationId_1_caseId_1_provider_1");
    } catch {
      // index déjà retiré
    }
    await col.updateMany(
      { $or: [{ invoiceKind: { $exists: false } }, { invoiceKind: null }] },
      { $set: { invoiceKind: "full" } },
    );
    await col.createIndex(
      { organizationId: 1, provider: 1, providerInvoiceId: 1 },
      { unique: true, name: "organizationId_1_provider_1_providerInvoiceId_1" },
    );
    await col.createIndex({ organizationId: 1, caseId: 1 }, { name: "organizationId_1_caseId_1" });
  },

  async down(db) {
    const col = db.collection("integration_syncs");
    try {
      await col.dropIndex("organizationId_1_provider_1_providerInvoiceId_1");
    } catch {
      // ignore
    }
    try {
      await col.dropIndex("organizationId_1_caseId_1");
    } catch {
      // ignore
    }
    await col.createIndex(
      { organizationId: 1, caseId: 1, provider: 1 },
      { unique: true, name: "organizationId_1_caseId_1_provider_1" },
    );
  },
};
