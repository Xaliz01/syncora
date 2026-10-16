/**
 * Index unique partiel pour lookup des jetons de reset mot de passe.
 */
async function dropIndexIgnoreMissing(collection, indexName) {
  try {
    await collection.dropIndex(indexName);
  } catch (err) {
    const code = err && typeof err === "object" ? err.code : undefined;
    const codeName = err && typeof err === "object" ? err.codeName : undefined;
    if (code !== 27 && code !== 26 && codeName !== "IndexNotFound" && codeName !== "NamespaceNotFound") throw err;
  }
}

module.exports = {
  async up(db) {
    const col = db.collection("users");
    await dropIndexIgnoreMissing(col, "passwordResetTokenHash_1");
    await col.createIndex(
      { passwordResetTokenHash: 1 },
      {
        name: "passwordResetTokenHash_1",
        unique: true,
        partialFilterExpression: { passwordResetTokenHash: { $type: "string" } },
      },
    );
  },

  async down(db) {
    await dropIndexIgnoreMissing(db.collection("users"), "passwordResetTokenHash_1");
  },
};
