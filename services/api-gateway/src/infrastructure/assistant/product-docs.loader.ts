/** Connaissance produit embarquée (alignée sur docs/product/) — disponible en Docker. */

export interface ProductDocChunk {
  id: string;
  title: string;
  text: string;
}

export const PRODUCT_DOC_CHUNKS: readonly ProductDocChunk[] = [
  {
    id: "about",
    title: "À propos / éditeur",
    text: `Qui a développé Planwise ? Planwise est développé et édité par Benoist Babin, entrepreneur individuel (SIREN 979 102 803), à Landerneau (Finistère, France). Nom commercial Planwise. Contact : contact@planwise.fr. Site : https://planwise.fr. Créateur, fondateur, éditeur, développeur = Benoist Babin. Planwise est un CRM terrain pour artisans, indépendants et TPE (clients, dossiers, planning, interventions, devis, facturation connectée). Mentions légales sur le site marketing.`,
  },
  {
    id: "routes",
    title: "Catalogue des menus",
    text: `Menus principaux Planwise : Tableau de bord (/), Ma journée (/my-day), Dossiers (/cases), Nouveau dossier (/cases/new), Planning (/cases/calendar), Contrats (/contracts), Stock (/stock), Reporting (/reporting), Facturation (/billing), Clients (/customers), Nouveau client (/customers/new), Donneurs d'ordre (/order-givers), Utilisateurs (/users), Équipes (/fleet/teams), Techniciens (/fleet/technicians), Véhicules (/fleet/vehicles), Agences (/fleet/agences), Prestations (/settings/prestations), Modèles de dossier (/settings/case-templates), Profils (/settings/profiles), Notifications (/settings/notifications), Intégrations (/settings/integrations), Recherche (/search), Mon organisation (/organization), Mon abonnement (/subscription), Mon compte (/account). Ne jamais inventer d'écran. Pour une fiche détail (dossier/client), guider vers la liste puis ouvrir depuis la liste.`,
  },
  {
    id: "glossary",
    title: "Glossaire",
    text: `Dossier = affaire / chantier. Client = bénéficiaire. Donneur d'ordre = tiers facturé éventuel. Intervention = rendez-vous terrain planifié. Ma journée = vue technicien du jour. Devis = devis lié au dossier. Facturation = suivi via intégration (Pennylane, Qonto) ou mode démo essai. Favoris = raccourcis URL sous l'en-tête. Historique = pages récemment visitées (navigateur).`,
  },
  {
    id: "journey-invite-user",
    title: "Inviter un utilisateur",
    text: `Pour inviter un utilisateur : menu Gestion → Utilisateurs (/users), puis Inviter, ou directement /users/new. Saisir l'e-mail et le profil / droits, envoyer l'invitation. Permission users.invite. Si le menu est absent : droit manquant ou abonnement inactif.`,
  },
  {
    id: "journey-client",
    title: "Créer un client",
    text: `Pour créer un client : menu Gestion → Clients (/customers) ou /customers/new. Choisir particulier/entreprise, renseigner contacts et adresse, enregistrer. Optionnel : sites d'intervention. Permission customers.create. Si le menu Clients n'apparaît pas : droit manquant ou abonnement inactif.`,
  },
  {
    id: "journey-case",
    title: "Créer un dossier",
    text: `Pour créer un dossier : Suivi → Dossiers (/cases) puis Nouveau, ou /cases/new. Titre, client, éventuellement donneur d'ordre et modèle de dossier (copie étapes/tâches). Modèles : /settings/case-templates. Ensuite planifier une intervention, suivre les tâches, créer un devis.`,
  },
  {
    id: "journey-my-day",
    title: "Ma journée et intervention",
    text: `Ma journée (/my-day) : interventions du jour pour le technicien. Démarrer, photos, notes, signature client, terminer, rapport PDF. Planning équipe : /cases/calendar. Liste vide = pas d'intervention assignée aujourd'hui. Permission interventions.read.`,
  },
  {
    id: "journey-planning",
    title: "Planning",
    text: `Planning (/cases/calendar) : vues jour/semaine/mois, glisser-déposer si autorisé. Création d'intervention souvent depuis un dossier. Permission cases.read.`,
  },
  {
    id: "journey-billing",
    title: "Devis et facturation",
    text: `Devis depuis la fiche dossier. Facturation (/billing) pour le suivi. Intégrations (/settings/integrations) : Pennylane, Qonto, ou facturation démo en essai. Une seule intégration de facturation active à la fois. Permission exports.billing pour le suivi. Outil absent → chat support Crisp.`,
  },
  {
    id: "journey-integrations",
    title: "Connecter une intégration",
    text: `Paramètres → Intégrations (/settings/integrations). Choisir le provider, OAuth ou clé, vérifier le statut connecté. Erreur OAuth → chat support Crisp.`,
  },
  {
    id: "rules",
    title: "Règles assistant",
    text: `Répondre en français, vouvoiement, réponses courtes. Proposer uniquement des liens du catalogue menus. Les questions sur l'éditeur / développeur / contact Planwise sont dans le périmètre (chunk À propos). Si hors périmètre (bug, juridique complexe, facturation Stripe) : escalader vers le support humain Crisp. Ne pas inventer de boutons. Pas d'accès aux données clients/dossiers de l'organisation.`,
  },
] as const;

const ABOUT_STRONG_TOKENS = new Set([
  "developpe",
  "developpeur",
  "developpeurs",
  "editeur",
  "createur",
  "fondateur",
  "auteur",
  "benoist",
  "babin",
  "propos",
]);

function isAboutIntent(tokens: string[]): boolean {
  if (tokens.some((t) => ABOUT_STRONG_TOKENS.has(t))) return true;
  // « qui … Planwise / développé » sans trop de faux positifs (« qui peut voir… »)
  return (
    tokens.includes("qui") &&
    (tokens.includes("planwise") ||
      tokens.includes("developpe") ||
      tokens.includes("editeur") ||
      tokens.includes("createur") ||
      tokens.includes("fondateur"))
  );
}

/** Recherche lexicale simple : score par chevauchement de tokens. */
export function retrieveProductChunks(query: string, limit = 4): ProductDocChunk[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return PRODUCT_DOC_CHUNKS.slice(0, limit);
  }

  const aboutIntent = isAboutIntent(tokens);

  const scored = PRODUCT_DOC_CHUNKS.map((chunk) => {
    const hay = tokenize(`${chunk.title} ${chunk.text}`);
    const haySet = new Set(hay);
    let score = 0;
    for (const t of tokens) {
      if (haySet.has(t)) score += 2;
      else if (hay.some((h) => h.includes(t) || t.includes(h))) score += 1;
    }
    if (aboutIntent && chunk.id === "about") score += 20;
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const positive = scored.filter((s) => s.score > 0).slice(0, limit);
  if (positive.length > 0) return positive.map((s) => s.chunk);
  return PRODUCT_DOC_CHUNKS.slice(0, Math.min(2, limit));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9]+/u)
    .filter((t) => t.length >= 2);
}
