/**
 * Seed du contenu e-mail prospection par défaut (backoffice).
 */
const DEFAULT_NAME = "Prospection beta (défaut)";

const DEFAULT_BODY = `{{greeting}}

Vous avez créé récemment votre entreprise : c’est le bon moment pour structurer votre activité sans vous ruiner en outils.

Planwise est un CRM pensé pour les indépendants, artisans et TPE. Il est actuellement en beta : simple, accessible, et adapté à une structure qui démarre. Pendant toute la beta, Planwise reste **gratuit**. Ensuite, l’abonnement Essentiel sera à **9,99 €** par mois, sans engagement, résiliable à tout moment. En rejoignant la beta, vous bénéficierez d’avantages réservés aux premiers utilisateurs.

Découvrez Planwise : {{landingUrl}}

L’équipe Planwise
Éditeur basé à Landerneau (29)`;

module.exports = {
  async up(db) {
    const col = db.collection("email_templates");
    await col.createIndex({ purpose: 1, name: 1 }, { unique: true });
    await col.createIndex({ purpose: 1, isDefault: 1 });

    const existing = await col.findOne({
      purpose: "prospect_outreach",
      name: DEFAULT_NAME,
    });
    if (existing) return;

    const now = new Date();
    await col.insertOne({
      name: DEFAULT_NAME,
      purpose: "prospect_outreach",
      subject: "Planwise — un CRM simple et accessible pour démarrer votre activité",
      body: DEFAULT_BODY,
      footer:
        "Cet e-mail est une présentation de Planwise destinée aux entreprises récemment créées. Répondez STOP pour ne plus être contacté.",
      ctaLabel: "Découvrir Planwise",
      ctaUrl: "/",
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    });
  },

  async down(db) {
    const col = db.collection("email_templates");
    await col.deleteOne({ purpose: "prospect_outreach", name: DEFAULT_NAME });
    try {
      await col.dropIndex("purpose_1_name_1");
    } catch (err) {
      if (err?.code !== 27 && err?.code !== 26 && err?.codeName !== "IndexNotFound" && err?.codeName !== "NamespaceNotFound") throw err;
    }
    try {
      await col.dropIndex("purpose_1_isDefault_1");
    } catch (err) {
      if (err?.code !== 27 && err?.code !== 26 && err?.codeName !== "IndexNotFound" && err?.codeName !== "NamespaceNotFound") throw err;
    }
  },
};
