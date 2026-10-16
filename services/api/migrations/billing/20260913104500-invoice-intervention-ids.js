module.exports = {
  async up(db) {
    await db
      .collection("invoices")
      .updateMany({ interventionIds: { $exists: false } }, { $set: { interventionIds: [] } });
  },

  async down(db) {
    await db.collection("invoices").updateMany({}, { $unset: { interventionIds: "" } });
  },
};
