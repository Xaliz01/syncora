/**
 * Seed du contenu e-mail support utilisateurs (backoffice → client).
 */
const DEFAULT_NAME = "Relance support (défaut)";

const DEFAULT_BODY = `{{greeting}}

Nous espérons que vous avancez bien avec Planwise.

N’hésitez pas à nous répondre si vous avez une question ou un frein : on est là pour vous aider à démarrer.

À très vite,
L’équipe Planwise`;

module.exports = {
  async up(db) {
    const col = db.collection("email_templates");

    const existing = await col.findOne({
      purpose: "user_support",
      name: DEFAULT_NAME,
    });
    if (existing) return;

    const now = new Date();
    await col.insertOne({
      name: DEFAULT_NAME,
      purpose: "user_support",
      subject: "Planwise — on est là si vous avez besoin",
      body: DEFAULT_BODY,
      footer:
        "Cet e-mail vous a été envoyé par l’équipe Planwise. Pour toute question, répondez à cet e-mail ou contactez le support.",
      ctaLabel: "Ouvrir Planwise",
      ctaUrl: "/",
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    });
  },

  async down(db) {
    await db.collection("email_templates").deleteOne({
      purpose: "user_support",
      name: DEFAULT_NAME,
    });
  },
};
