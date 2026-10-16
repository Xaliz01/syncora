/**
 * Backfill caseNumber (YYYY-0001) + index unique, et aligne le titre d’affichage.
 */

function buildCaseDisplayTitle(caseNumber, partyLabel) {
  const label = typeof partyLabel === "string" ? partyLabel.trim() : "";
  return label ? `${caseNumber} - ${label}` : caseNumber;
}

function padSeq(n) {
  return String(n).padStart(4, "0");
}

module.exports = {
  async up(db) {
    const col = db.collection("cases");
    const missing = await col
      .find({
        $or: [{ caseNumber: { $exists: false } }, { caseNumber: null }, { caseNumber: "" }],
      })
      .sort({ organizationId: 1, createdAt: 1, _id: 1 })
      .toArray();

    /** @type {Map<string, Map<number, number>>} */
    const nextByOrgYear = new Map();

    const withNumber = await col
      .find({ caseNumber: { $type: "string" } })
      .project({ organizationId: 1, caseNumber: 1 })
      .toArray();
    for (const doc of withNumber) {
      const m = String(doc.caseNumber).match(/^(\d{4})-(\d+)$/);
      if (!m) continue;
      const year = Number(m[1]);
      const seq = Number(m[2]);
      if (!Number.isFinite(year) || !Number.isFinite(seq)) continue;
      if (!nextByOrgYear.has(doc.organizationId)) nextByOrgYear.set(doc.organizationId, new Map());
      const yearMap = nextByOrgYear.get(doc.organizationId);
      const prev = yearMap.get(year) ?? 0;
      if (seq > prev) yearMap.set(year, seq);
    }

    for (const doc of missing) {
      const createdAt =
        doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt || Date.now());
      const year = createdAt.getFullYear();
      if (!nextByOrgYear.has(doc.organizationId)) nextByOrgYear.set(doc.organizationId, new Map());
      const yearMap = nextByOrgYear.get(doc.organizationId);
      const next = (yearMap.get(year) ?? 0) + 1;
      yearMap.set(year, next);
      const caseNumber = `${year}-${padSeq(next)}`;
      const oldTitle = typeof doc.title === "string" ? doc.title.trim() : "";
      const title = buildCaseDisplayTitle(caseNumber, oldTitle || undefined);
      await col.updateOne({ _id: doc._id }, { $set: { caseNumber, title } });
    }

    await col.createIndex(
      { organizationId: 1, caseNumber: 1 },
      {
        name: "organizationId_1_caseNumber_1",
        unique: true,
        partialFilterExpression: {
          caseNumber: { $type: "string" },
        },
      },
    );
  },

  async down(db) {
    const col = db.collection("cases");
    try {
      await col.dropIndex("organizationId_1_caseNumber_1");
    } catch (err) {
      const code = err && typeof err === "object" ? err.code : undefined;
      const codeName = err && typeof err === "object" ? err.codeName : undefined;
      if (
        code !== 27 &&
        code !== 26 &&
        codeName !== "IndexNotFound" &&
        codeName !== "NamespaceNotFound"
      ) {
        throw err;
      }
    }
  },
};
