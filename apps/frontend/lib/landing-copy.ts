/** Textes marketing partagés (landing + assertions E2E). */

export const LANDING_TAGLINE = "CRM accessible aux artisans et TPE";

export const LANDING_HERO_HEADING = "Le CRM terrain abordable pour indépendants, artisans et TPE";

export const LANDING_HERO_SUPPORT =
  "Solo, duo ou petite équipe : centralisez clients, dossiers, planning, interventions, devis, documents et contrats de maintenance, et connectez votre outil de facturation — sans complexité enterprise, à un prix clair dès le départ.";

/** Accroche parcours d’essai en quelques minutes. */
export const LANDING_HERO_HOOK =
  "Essayez Planwise en moins de deux minutes : créez votre compte, renseignez votre SIRET, injectez en un clic un jeu de données de démo.";

/**
 * Accompagnement éditeur (landing + login) : évolution produit, aide à l’import, chat.
 */
export const LANDING_ACCOMPANIMENT = {
  title: "On avance avec vous",
  intro:
    "Planwise est en constante évolution : de nouvelles fonctionnalités arrivent régulièrement, et l’éditeur reste à l’écoute de vos besoins métier.",
  points: [
    {
      title: "Produit vivant",
      description:
        "L’application évolue en continu. Vos retours orientent les fonctionnalités futures — dites-nous ce qui vous manque vraiment sur le terrain.",
    },
    {
      title: "Déjà un CRM ?",
      description:
        "On peut vous aider à importer vos données (clients, dossiers…) pour démarrer sans tout ressaisir.",
    },
    {
      title: "Chat à votre disposition",
      description:
        "Une question, une idée de fonctionnalité, besoin d’aide pour migrer ou démarrer ? Ouvrez le chat : on vous répond.",
    },
  ],
} as const;

/** Piliers marketing (landing + page de connexion). */
export const LANDING_PILLARS = [
  {
    title: "Accessible dès le premier jour",
    description:
      "Indépendant ou petite équipe : démarrez vite grâce aux modèles de dossier et profils prêts à importer — sans consultant ni formation lourde.",
  },
  {
    title: "Planning interactif",
    description:
      "Vue jour, semaine ou mois, couleurs par équipe : glissez-déposez les interventions, réassignez en un geste et visualisez la charge de chacun.",
  },
  {
    title: "Dossiers et interventions centralisés",
    description:
      "Suivez chaque dossier, son avancement, ses tâches et son historique depuis un seul endroit.",
  },
  {
    title: "Terrain et preuve d'intervention",
    description:
      "Vos techniciens démarrent, documentent en photos, font signer le client et génèrent le rapport PDF depuis le chantier.",
  },
  {
    title: "Contrats de maintenance suivis",
    description:
      "Planifiez les visites récurrentes : Planwise génère automatiquement les dossiers et interventions à venir.",
  },
  {
    title: "Facturation sans double saisie",
    description:
      "Connectez votre outil de facturation, ou activez la facturation démo pendant l’essai : créez, suivez et validez vos factures depuis Planwise.",
  },
] as const;
