/**
 * Historique append-only des e-mails de prospection (emailSends).
 * Backfill d’une entrée à partir du dernier envoi connu (sent / failed).
 */
module.exports = {
  async up(db) {
    const col = db.collection("prospect_outreaches");
    await col.updateMany({ emailSends: { $exists: false } }, { $set: { emailSends: [] } });

    const toBackfill = await col
      .find({
        status: { $in: ["sent", "failed"] },
        $or: [{ emailSends: { $exists: false } }, { emailSends: { $size: 0 } }],
      })
      .toArray();

    for (const doc of toBackfill) {
      const sentAt = doc.sentAt instanceof Date ? doc.sentAt : new Date(doc.sentAt);
      await col.updateOne(
        { _id: doc._id },
        {
          $set: {
            emailSends: [
              {
                sentAt,
                subject: typeof doc.subject === "string" ? doc.subject : "",
                toEmail: typeof doc.email === "string" ? doc.email : "",
                sentByUserId: doc.sentByUserId ?? "",
                sentByEmail: doc.sentByEmail ?? "",
                status: doc.status,
              },
            ],
          },
        },
      );
    }
  },

  async down(db) {
    await db.collection("prospect_outreaches").updateMany({}, { $unset: { emailSends: "" } });
  },
};
