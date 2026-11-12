/**
 * Compteurs de quota copilote et historique des instructions vocales.
 * Les champs sont créés à l'usage ; ici uniquement les index.
 */
function isIgnorableIndexError(err) {
  const code = err && typeof err === "object" ? err.code : undefined;
  const codeName = err && typeof err === "object" ? err.codeName : undefined;
  return code === 27 || code === 26 || code === 85 || codeName === "IndexNotFound" || codeName === "NamespaceNotFound" || codeName === "IndexOptionsConflict";
}

async function dropIndex(collection, name) {
  try {
    await collection.dropIndex(name);
  } catch (err) {
    if (!isIgnorableIndexError(err)) throw err;
  }
}

module.exports = {
  async up(db) {
    await db.collection("ai_quota_counters").createIndex(
      { organizationId: 1, usage: 1, period: 1 },
      { unique: true, name: "ai_quota_org_usage_period" },
    );
    await db.collection("copilot_sessions").createIndex(
      { organizationId: 1, createdAt: -1 },
      { name: "copilot_sessions_org_created" },
    );
  },

  async down(db) {
    await dropIndex(db.collection("ai_quota_counters"), "ai_quota_org_usage_period");
    await dropIndex(db.collection("copilot_sessions"), "copilot_sessions_org_created");
  },
};
