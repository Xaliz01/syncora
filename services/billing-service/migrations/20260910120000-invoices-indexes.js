module.exports = {
  async up(db) {
    const invoices = db.collection("invoices");
    await invoices.createIndex({ organizationId: 1, caseId: 1, createdAt: -1 });
    await invoices.createIndex(
      { organizationId: 1, number: 1 },
      { unique: true, partialFilterExpression: { number: { $type: "string" } } },
    );
    const sequences = db.collection("invoice_sequences");
    await sequences.createIndex({ organizationId: 1, series: 1, year: 1 }, { unique: true });
  },

  async down(db) {
    const invoices = db.collection("invoices");
    try {
      await invoices.dropIndex("organizationId_1_caseId_1_createdAt_-1");
    } catch (err) {
      if (err && err.code !== 27) throw err;
    }
    try {
      await invoices.dropIndex("organizationId_1_number_1");
    } catch (err) {
      if (err && err.code !== 27) throw err;
    }
    const sequences = db.collection("invoice_sequences");
    try {
      await sequences.dropIndex("organizationId_1_series_1_year_1");
    } catch (err) {
      if (err && err.code !== 27) throw err;
    }
  },
};
