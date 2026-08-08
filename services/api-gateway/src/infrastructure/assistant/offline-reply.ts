/** Réponse guidée sans LLM : matching routes + parcours, texte lisible. */

import {
  ASSISTANT_MAX_SUGGESTIONS,
  ASSISTANT_ROUTE_CATALOG,
  type AssistantSuggestion,
  type PermissionCode,
  canAccessAssistantRoute,
  getAssistantRouteByHref,
} from "@planwise/shared";
import { retrieveProductChunks, type ProductDocChunk } from "./product-docs.loader";

/** Mots-clés supplémentaires par href (synonymes / intentions). */
const ROUTE_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  "/users/new": [
    "inviter",
    "invitation",
    "invite",
    "nouvel utilisateur",
    "ajouter utilisateur",
    "creer utilisateur",
    "membre",
  ],
  "/users": [
    "utilisateur",
    "utilisateurs",
    "membres",
    "equipe",
    "droits",
    "permissions",
    "technicien associe",
  ],
  "/customers/new": ["creer client", "nouveau client", "ajouter client"],
  "/customers": ["client", "clients"],
  "/cases/new": ["creer dossier", "nouveau dossier", "ouvrir dossier"],
  "/cases": ["dossier", "dossiers", "affaire", "affaires"],
  "/cases/calendar": ["planning", "calendrier", "agenda", "assigner", "intervention"],
  "/my-day": ["ma journee", "terrain", "intervention du jour", "technicien"],
  "/billing": ["facture", "factures", "facturation"],
  "/settings/integrations": ["integration", "integrations", "pennylane", "qonto", "connecter"],
  "/settings/case-templates": ["modele", "modeles", "template", "metier"],
  "/settings/prestations": ["prestation", "prestations", "catalogue"],
  "/settings/profiles": ["profil", "profils", "permissions", "droits"],
  "/organization": ["organisation", "entreprise", "siret"],
  "/subscription": ["abonnement", "essai", "stripe"],
  "/account": ["compte", "mot de passe", "profil perso"],
  "/fleet/technicians": [
    "technicien",
    "techniciens",
    "assigner",
    "assignation",
    "affectation",
    "lier",
  ],
  "/fleet/teams": ["equipe", "equipes", "assigner"],
  "/fleet/vehicles": ["vehicule", "vehicules", "flotte"],
  "/fleet/agences": ["agence", "agences"],
  "/stock": ["stock", "mouvement", "mouvements", "article"],
  "/settings/stock/articles": ["article", "articles", "catalogue"],
  "/settings/stock/locations": ["emplacement", "emplacements"],
  "/reporting": ["reporting", "rapport", "rapports", "stats", "export", "kilometrique"],
  "/contracts": ["contrat", "contrats", "maintenance", "visite"],
  "/contracts/new": ["nouveau contrat", "creer contrat"],
  "/order-givers": ["donneur", "donneurs", "ordre"],
  "/order-givers/new": ["nouveau donneur"],
  "/search": ["rechercher", "recherche", "trouver"],
  "/settings/notifications": ["notification", "notifications", "push", "cloche", "rappel"],
  "/": ["tableau de bord", "dashboard", "accueil", "demo", "essai"],
};

export interface OfflineAssistantMatch {
  href: string;
  label: string;
  score: number;
}

export function scoreRoutesForQuery(
  query: string,
  hasPermission: (code: PermissionCode) => boolean,
): OfflineAssistantMatch[] {
  const normalized = normalizeText(query);
  const tokens = tokenize(normalized);
  if (tokens.length === 0) return [];

  const matches: OfflineAssistantMatch[] = [];

  for (const route of ASSISTANT_ROUTE_CATALOG) {
    if (!canAccessAssistantRoute(route, hasPermission)) continue;

    const labelNorm = normalizeText(route.label);
    const labelTokens = tokenize(labelNorm);
    const keywords = (ROUTE_KEYWORDS[route.href] ?? []).map(normalizeText);
    const keywordBlob = keywords.join(" ");

    let score = 0;

    // Phrase entière du label dans la question
    if (normalized.includes(labelNorm) && labelNorm.length >= 4) {
      score += 20;
    }

    for (const lt of labelTokens) {
      if (lt.length < 3) continue;
      if (tokens.includes(lt)) score += 8;
      else if (tokens.some((t) => t.includes(lt) || lt.includes(t))) score += 3;
    }

    for (const kw of keywords) {
      if (kw.includes(" ")) {
        if (normalized.includes(kw)) score += 15;
      } else if (tokens.includes(kw)) {
        score += 10;
      } else if (tokens.some((t) => t.includes(kw) || kw.includes(t))) {
        score += 4;
      }
    }

    // Bonus si plusieurs tokens de la question touchent label+keywords
    const hayTokens = new Set([...labelTokens, ...tokenize(keywordBlob)]);
    const overlap = tokens.filter(
      (t) => hayTokens.has(t) || [...hayTokens].some((h) => h.includes(t)),
    );
    if (overlap.length >= 2) score += 5;

    if (score > 0) {
      matches.push({ href: route.href, label: route.label, score });
    }
  }

  matches.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "fr"));
  return matches;
}

export function buildOfflineAssistantReply(options: {
  message: string;
  hasPermission: (code: PermissionCode) => boolean;
}): { reply: string; suggestions: AssistantSuggestion[]; escalateToSupport: boolean } {
  const faq = matchOfflineFaq(options.message);
  if (faq) {
    return faq;
  }

  const matches = scoreRoutesForQuery(options.message, options.hasPermission);
  const top = matches.slice(0, ASSISTANT_MAX_SUGGESTIONS);
  const docs = retrieveProductChunks(options.message, 2).filter(
    (d) => d.id !== "routes" && d.id !== "rules" && d.id !== "glossary",
  );

  if (top.length === 0) {
    return {
      reply:
        "Je n’ai pas trouvé d’écran correspondant clairement à votre question (mode sans IA).\n\nReformulez avec un mot du menu (ex. « inviter un utilisateur », « créer un client », « planning »), ou utilisez le chat support.",
      suggestions: [],
      escalateToSupport: true,
    };
  }

  const primary = top[0]!;
  const journeyHint = formatJourneyHint(docs[0], primary.href);
  const steps = buildStepsForRoute(primary.href, primary.label);

  const otherLinks = top
    .slice(1)
    .map((m) => `• ${m.label}`)
    .join("\n");

  const parts = [
    `Pour « ${truncate(options.message.trim(), 80)} », l’écran le plus proche est « ${primary.label} ».`,
    steps,
    journeyHint,
    otherLinks ? `Autres écrans utiles :\n${otherLinks}` : "",
    "Sans moteur IA, les réponses restent basées sur le catalogue menus. Le chat support reste disponible pour un humain.",
  ].filter(Boolean);

  const suggestions: AssistantSuggestion[] = top.map((m) => ({
    label: m.label,
    href: m.href,
  }));

  // Toujours proposer la liste parente si on a un /new
  if (primary.href.endsWith("/new")) {
    const parentHref = primary.href.replace(/\/new$/, "") || "/";
    const parent = getAssistantRouteByHref(parentHref);
    if (
      parent &&
      canAccessAssistantRoute(parent, options.hasPermission) &&
      !suggestions.some((s) => s.href === parent.href)
    ) {
      suggestions.splice(1, 0, { label: parent.label, href: parent.href });
    }
  }

  return {
    reply: parts.join("\n\n").slice(0, 2500),
    suggestions: suggestions.slice(0, ASSISTANT_MAX_SUGGESTIONS),
    escalateToSupport: true,
  };
}

/** FAQ hors navigation (éditeur, contact…) — prioritaire sur le matching de routes. */
export function matchOfflineFaq(
  message: string,
): { reply: string; suggestions: AssistantSuggestion[]; escalateToSupport: boolean } | null {
  const normalized = normalizeText(message);
  const tokens = new Set(tokenize(normalized));

  const aboutHit =
    /qui (a |as )?(developpe|cree|fonde)|createur|fondateur|editeur|developpeur|benoist|babin|a propos|qui etes/.test(
      normalized,
    ) ||
    (tokens.has("qui") &&
      (tokens.has("developpe") ||
        tokens.has("developpeur") ||
        tokens.has("editeur") ||
        tokens.has("createur") ||
        tokens.has("fondateur") ||
        tokens.has("planwise")));

  if (aboutHit) {
    return {
      reply:
        "Planwise est développé et édité par Benoist Babin, entrepreneur individuel basé à Landerneau (Finistère, France).\n\nContact : contact@planwise.fr — site : https://planwise.fr",
      suggestions: [],
      escalateToSupport: false,
    };
  }

  const contactHit =
    /contact|nous ecrire|adresse mail|email support|mail support/.test(normalized) ||
    (tokens.has("contact") && (tokens.has("planwise") || tokens.has("support")));

  if (contactHit) {
    return {
      reply:
        "Vous pouvez nous écrire à contact@planwise.fr, ou ouvrir le chat support dans l’application pour parler à un humain.",
      suggestions: [],
      escalateToSupport: true,
    };
  }

  const assignHit =
    /assigner|assignation|affectation|affecter/.test(normalized) &&
    (/intervention|utilisateur|technicien|equipe/.test(normalized) ||
      tokens.has("intervention") ||
      tokens.has("utilisateur") ||
      tokens.has("technicien"));

  if (assignHit) {
    return {
      reply:
        "On n’assigne pas un utilisateur directement sur une intervention : on assigne un **technicien** (ou une équipe).\n\n1. Créez ou ouvrez un technicien (Flotte → Techniciens), et liez-le au compte utilisateur (ou « Créer un technicien associé » depuis la fiche utilisateur).\n2. Ouvrez le dossier ou le Planning, puis choisissez ce technicien (ou son équipe) sur l’intervention.\n3. L’utilisateur lié verra l’intervention dans Ma journée le jour prévu ; les notifications exigent aussi ce lien.",
      suggestions: [
        { label: "Techniciens", href: "/fleet/technicians" },
        { label: "Planning", href: "/cases/calendar" },
        { label: "Utilisateurs", href: "/users" },
        { label: "Ma journée", href: "/my-day" },
      ],
      escalateToSupport: false,
    };
  }

  const billingHit =
    /facturer|facture|facturation|factures/.test(normalized) &&
    !/stripe|abonnement|carte bancaire|essai gratuit/.test(normalized);

  if (billingHit) {
    return {
      reply:
        "Oui, mais Planwise **ne facture pas tout seul** : les devis se créent dans Planwise (sur un dossier), et les factures passent par un **outil de facturation connecté** (Pennylane, Qonto) ou le **mode démo** pendant l’essai.\n\n1. Paramètres → Intégrations : connectez votre outil (ou activez la facturation démo).\n2. Sur un dossier : créez le devis, puis lancez la facture via l’intégration.\n3. Suivez l’avancement dans Facturation.",
      suggestions: [
        { label: "Intégrations", href: "/settings/integrations" },
        { label: "Facturation", href: "/billing" },
        { label: "Dossiers", href: "/cases" },
      ],
      escalateToSupport: false,
    };
  }

  const favoritesHit =
    /favori|favoris|etoile|bookmark|epingle|raccourci/.test(normalized) ||
    (tokens.has("mettre") && tokens.has("page") && (tokens.has("favori") || tokens.has("favoris")));

  if (favoritesHit) {
    return {
      reply:
        "Oui : Planwise a une **barre de favoris** sous l’en-tête (ce n’est pas les favoris du navigateur).\n\n1. Ouvrez la page à épingler.\n2. Cliquez l’**étoile (★)** dans la barre de favoris pour ajouter la page courante.\n3. Autre méthode : **glissez** un lien du menu latéral vers la barre.\n4. Pour retirer : recliquez l’étoile ou retirez le favori dans la barre.\n\nL’**historique** (pages récentes) est l’icône **horloge** à côté — ce n’est pas la même chose.",
      suggestions: [{ label: "Tableau de bord", href: "/" }],
      escalateToSupport: false,
    };
  }

  const historyHit =
    /historique/.test(normalized) &&
    (/navigation|pages? recent|horloge|derniere?s? pages?/.test(normalized) ||
      tokens.has("navigation") ||
      tokens.has("horloge") ||
      tokens.has("recent") ||
      tokens.has("recents"));

  if (historyHit) {
    return {
      reply:
        "L’**historique de navigation** se trouve via l’icône **horloge** à côté de la barre de favoris (sous le header).\n\nIl liste les pages récentes (par utilisateur et organisation). Ce n’est pas les favoris (étoile ★) et ce n’est pas une entrée du menu latéral.",
      suggestions: [{ label: "Tableau de bord", href: "/" }],
      escalateToSupport: false,
    };
  }

  const contractHit =
    /contrat|maintenance|visite a programmer|auto.?plan/.test(normalized) &&
    !/stripe|abonnement/.test(normalized);

  if (contractHit) {
    return {
      reply:
        "Les **contrats de maintenance** sont dans Suivi → Contrats.\n\n1. Créez un contrat (client, modèle de dossier, récurrence).\n2. Choisissez le mode : **À programmer avec le client** (rappel, vous posez le créneau) ou **Auto-planifier à l’échéance** (crée dossier + intervention).\n3. Activez le contrat. Les visites à programmer apparaissent aussi sur le tableau de bord.",
      suggestions: [
        { label: "Contrats", href: "/contracts" },
        { label: "Nouveau contrat", href: "/contracts/new" },
        { label: "Tableau de bord", href: "/" },
      ],
      escalateToSupport: false,
    };
  }

  const demoHit =
    /donnees? de demo|jeu de (donnees|demo)|injecter.*(demo|donnees)|charger.*(demo|donnees)|essai.*demo|demo.*essai/.test(
      normalized,
    ) ||
    (tokens.has("demo") &&
      (tokens.has("donnees") ||
        tokens.has("injecter") ||
        tokens.has("charger") ||
        tokens.has("essai")));

  if (demoHit) {
    return {
      reply:
        "Pendant l’**essai**, vous pouvez charger des **données de démo** :\n\n1. À l’**onboarding** (après inscription), choisissez d’injecter la démo.\n2. Via le **guide de démarrage** (modal fondateur).\n3. Via la carte sur le **tableau de bord** (admins, statut essai).\n\nLes données sont marquées « Démo » et peuvent être purgées (manuellement ou en fin d’essai).",
      suggestions: [{ label: "Tableau de bord", href: "/" }],
      escalateToSupport: false,
    };
  }

  const documentStorageHit =
    /(limite|quota|nombre).{0,40}(document|documents|fichier|fichiers|photo|pdf|pj)/.test(
      normalized,
    ) ||
    /(document|documents|fichier|fichiers|photo|pdf).{0,40}(limite|quota|stockage|deposer|depot)/.test(
      normalized,
    ) ||
    /stockage (de )?documents|quota de stockage|combien (de )?(documents|fichiers|go)/.test(
      normalized,
    ) ||
    (tokens.has("documents") &&
      (tokens.has("limite") ||
        tokens.has("nombre") ||
        tokens.has("quota") ||
        tokens.has("deposer") ||
        tokens.has("stockage")));

  if (documentStorageHit) {
    return {
      reply:
        "Il n’y a **pas de limite sur le nombre** de documents : la limite est un **quota d’espace** pour l’organisation.\n\n1. L’offre Essentiel inclut **10 Go** de stockage documents (ordre de grandeur ≈ 10 000 photos ou PDF).\n2. Consultez l’usage (utilisé / quota) dans **Mon abonnement**.\n3. Si besoin, augmentez avec l’addon **stockage supplémentaire** (+50 Go / unité).\n\nL’upload est bloqué lorsque le quota est atteint.",
      suggestions: [{ label: "Mon abonnement", href: "/subscription" }],
      escalateToSupport: false,
    };
  }

  const subscriptionHit =
    /abonnement|essai gratuit|prix|tarif|addon|essentiel/.test(normalized) ||
    (tokens.has("stripe") && (tokens.has("abonnement") || tokens.has("payer")));

  if (subscriptionHit && !/facturer (un |le |mon )?client|facture client/.test(normalized)) {
    return {
      reply:
        "L’accès Planwise se gère dans **Mon abonnement** : plan Essentiel (~9,99 €/mois), 2 utilisateurs et 10 Go inclus, essai ~15 jours.\n\nDes **addons** existent (suggestion d’équipe, utilisateurs, stockage). L’assistant et le chat support sont inclus.\n\nAttention : ce n’est **pas** la facturation de vos clients (Pennylane / Qonto / démo → Intégrations + Facturation).",
      suggestions: [
        { label: "Mon abonnement", href: "/subscription" },
        { label: "Intégrations", href: "/settings/integrations" },
      ],
      escalateToSupport: false,
    };
  }

  const notifHit =
    /notification|notifications|push|cloche/.test(normalized) ||
    (tokens.has("rappel") && (tokens.has("mail") || tokens.has("email") || tokens.has("push")));

  if (notifHit) {
    return {
      reply:
        "Les notifications in-app sont dans la **cloche** du header.\n\nPour les régler : Paramètres → **Notifications** (in-app, e-mail, push, délais de rappel).\n\nSi le navigateur a bloqué le push, réactivez-le dans les réglages du site (sur iPhone : installer d’abord via « Sur l’écran d’accueil »).",
      suggestions: [{ label: "Notifications", href: "/settings/notifications" }],
      escalateToSupport: false,
    };
  }

  const stockHit =
    (/stock|emplacement|mouvement/.test(normalized) &&
      (tokens.has("article") ||
        tokens.has("articles") ||
        tokens.has("stock") ||
        tokens.has("mouvement") ||
        tokens.has("emplacement"))) ||
    /catalogue articles/.test(normalized);

  if (stockHit) {
    return {
      reply:
        "Le **stock** (physique) se gère ainsi :\n\n1. Catalogue articles → Paramètres → Catalogue articles.\n2. Emplacements → Paramètres → Emplacements de stock.\n3. Mouvements (entrées/sorties…) → Suivi → Mouvements de stock.\n\nLes **prestations** (Paramètres → Prestations) servent aux devis / factures — ce n’est pas le stock.",
      suggestions: [
        { label: "Mouvements de stock", href: "/stock" },
        { label: "Catalogue articles", href: "/settings/stock/articles" },
        { label: "Prestations", href: "/settings/prestations" },
      ],
      escalateToSupport: false,
    };
  }

  return null;
}

function buildStepsForRoute(href: string, label: string): string {
  const known: Record<string, string> = {
    "/users/new":
      "1. Menu Gestion → Utilisateurs, puis Inviter (ou ouvrez directement le lien ci-dessous).\n2. Saisissez l’e-mail et le profil / droits.\n3. Envoyez l’invitation : la personne recevra un e-mail pour rejoindre l’organisation.",
    "/users":
      "1. Ouvrez Utilisateurs pour voir les membres.\n2. Pour en ajouter un, utilisez Inviter un utilisateur.",
    "/customers/new":
      "1. Menu Gestion → Clients → Nouveau (ou le lien ci-dessous).\n2. Choisissez particulier / entreprise, renseignez les contacts, enregistrez.",
    "/cases/new":
      "1. Menu Suivi → Dossiers → Nouveau.\n2. Titre, client, éventuellement un modèle de dossier, puis enregistrez.",
    "/cases/calendar":
      "1. Menu Suivi → Planning.\n2. Choisissez la vue jour / semaine / mois ; cliquez une intervention pour le détail.\n3. L’assignation se fait sur un technicien ou une équipe (pas un utilisateur).",
    "/my-day":
      "1. Menu Suivi → Ma journée (compte lié à un technicien).\n2. Ouvrez une intervention pour démarrer, photos, signature, clôture.",
    "/fleet/technicians":
      "1. Flotte → Techniciens.\n2. Créez un technicien ou ouvrez une fiche, puis liez un compte utilisateur si besoin.\n3. L’assignation d’intervention se fait ensuite sur ce technicien (dossier ou planning).",
    "/billing":
      "1. Planwise ne facture pas seul : connectez d’abord un outil (Paramètres → Intégrations) ou le mode démo essai.\n2. Créez le devis sur un dossier, puis émettez/synchronisez la facture via l’intégration.\n3. Suivez le résultat dans Facturation.",
    "/settings/integrations":
      "1. Paramètres → Intégrations.\n2. Choisissez Pennylane, Qonto ou le mode démo (essai), puis suivez la connexion — requis pour facturer.",
    "/contracts":
      "1. Suivi → Contrats.\n2. Créez un contrat avec le mode « avec le client » ou « auto-planifier ».\n3. Activez-le pour générer / programmer les visites.",
    "/contracts/new":
      "1. Renseignez client, modèle, récurrence.\n2. Choisissez le mode de planification et le rappel (7/14/30 j).\n3. Enregistrez puis activez le contrat.",
    "/stock":
      "1. Suivi → Mouvements de stock.\n2. Enregistrez entrées, sorties, ajustements ou transferts.\n3. Le catalogue articles et les emplacements sont dans Paramètres.",
    "/reporting":
      "1. Suivi → Reporting.\n2. Ouvrez la carte du rapport souhaité.\n3. Consultez le tableau puis exportez (Excel, CSV, PDF).",
    "/settings/notifications":
      "1. Paramètres → Notifications.\n2. Choisissez canaux (in-app, e-mail, push) et types d’événements.\n3. Pour le push, autorisez le navigateur si demandé.",
    "/subscription":
      "1. Ouvrez Mon abonnement.\n2. Consultez l’essai / le plan Essentiel et les addons.\n3. Pour facturer vos clients, ce n’est pas ici : utilisez Intégrations.",
    "/organization":
      "1. Ouvrez Mon organisation.\n2. Mettez à jour nom, contacts, adresse, logo.\n3. Pour changer d’entreprise : utilisez le sélecteur d’organisation dans la barre latérale.",
    "/account":
      "1. Ouvrez Mon compte.\n2. Identité, mot de passe, thème, sessions.\n3. Le thème est aussi accessible via le toggle de l’en-tête.",
    "/search":
      "1. Utilisez le champ recherche de l’en-tête (ou ouvrez Recherche).\n2. Saisissez un nom / mot-clé.\n3. Ouvrez le résultat selon vos droits.",
  };

  return (
    known[href] ?? `Ouvrez « ${label} » via le lien proposé, puis suivez les actions à l’écran.`
  );
}

function formatJourneyHint(doc: ProductDocChunk | undefined, primaryHref: string): string {
  if (!doc) return "";
  // Éviter de répéter un pavé catalogue ; garder 1–2 phrases utiles
  const sentence = doc.text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && !s.startsWith("Menus principaux"))
    .find((s) => s.includes(primaryHref) || s.length < 220);
  if (!sentence) return "";
  return `Contexte : ${sentence}`;
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/['’]/g, " ");
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/u)
    .filter((t) => t.length >= 2);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
