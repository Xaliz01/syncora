/**
 * Add fieldReport and fieldReportConfirmedAt fields to interventions
 * (AI field report — feature A1).
 * No index needed — the fields are read alongside the document, not queried independently.
 */
module.exports = {
  async up() {
    // Schema-only change: Mongoose handles new nullable fields automatically.
    // No data migration required — existing documents simply have no fieldReport.
  },

  async down() {
    // Nothing to revert — the fields are optional and unused before this migration.
  },
};
