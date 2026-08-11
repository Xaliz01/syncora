/** Textes marketing partagés (landing + assertions E2E). */

export const LANDING_TAGLINE = "CRM accessible aux artisans et TPE";

export const LANDING_HERO_HEADING = "Le CRM terrain accessible pour indépendants, artisans et TPE";

export const LANDING_HERO_SUPPORT =
  "Solo, duo ou petite équipe : centralisez clients, dossiers, planning, interventions, devis, documents et contrats de maintenance, et connectez votre outil de facturation — sans complexité enterprise, à un prix clair dès le départ.";

/** Accroche parcours d’essai en quelques minutes. */
export const LANDING_HERO_HOOK =
  "Essayez Planwise en moins de deux minutes : créez votre compte, renseignez votre SIRET, injectez en un clic un jeu de données de démo.";

/** Précision beta : gratuit pendant toute la phase beta. */
export const LANDING_BETA_FREE_NOTE = "Pendant toute la beta, Planwise reste gratuit.";

/**
 * Accompagnement éditeur (landing + login) : évolution produit, aide à l’import, assistant, chat.
 */
export const LANDING_ACCOMPANIMENT = {
  title: "On avance avec vous",
  intro:
    "Planwise évolue avec vous : import de données, assistant IA, et chat pour échanger avec nous.",
  points: [
    {
      title: "Produit vivant",
      description: "Nouvelles fonctionnalités régulières ; vos retours orientent la suite.",
    },
    {
      title: "Déjà un CRM ?",
      description: "On vous aide à importer clients et dossiers pour démarrer sans tout ressaisir.",
    },
    {
      title: "Assistant IA",
      description:
        "Guide in-app : où cliquer, comment créer une intervention — avec liens vers les écrans.",
    },
    {
      title: "Chat support",
      description: "Une question, une idée ou besoin d’aide ? Ouvrez le chat, on vous répond.",
    },
  ],
} as const;

/** Bloc fonctionnalités landing — assistant in-app. */
export const LANDING_ASSISTANT_FEATURE = {
  title: "Assistant IA",
  items: [
    "Posez une question : « où est le planning ? », « comment inviter un utilisateur ? »",
    "Réponses courtes avec liens vers les bons écrans, selon vos droits",
    "Escalade vers le chat support humain quand il faut une vraie personne",
  ],
} as const;

/** Bloc fonctionnalités landing — commandes vocales terrain (Ma journée). */
export const LANDING_VOICE_FEATURE = {
  title: "Commandes vocales terrain",
  items: [
    "Sur Ma journée (mobile) : activez l’option, dites « Planwise » ou « Plan »",
    "Démarrez, terminez ou commentez une intervention sans toucher l’écran",
    "Opt-in dans Mon compte — distinct de l’assistant guide IA",
  ],
} as const;

/** Pastille login — assistant in-app. */
export const LOGIN_ASSISTANT_HIGHLIGHT = "Assistant IA pour vous guider dans Planwise";

/** Piliers marketing (landing + page de connexion). */
export const LANDING_PILLARS = [
  {
    title: "Accessible dès le premier jour",
    description:
      "Indépendant ou petite équipe : démarrez vite grâce aux modèles de dossier et profils prêts à importer — sans consultant ni formation lourde.",
  },
  {
    title: "Assistant IA intégré",
    description:
      "Un guide in-app répond à vos questions et vous envoie vers le bon menu — pour trouver rapidement planning, clients, devis ou invitations.",
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
      "Vos techniciens démarrent, documentent en photos, font signer le client et génèrent le rapport PDF — aussi à la voix sur Ma journée (mobile).",
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
