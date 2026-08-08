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
  "/users": ["utilisateur", "utilisateurs", "membres", "equipe", "droits", "permissions"],
  "/customers/new": ["creer client", "nouveau client", "ajouter client"],
  "/customers": ["client", "clients"],
  "/cases/new": ["creer dossier", "nouveau dossier", "ouvrir dossier"],
  "/cases": ["dossier", "dossiers", "affaire", "affaires"],
  "/cases/calendar": ["planning", "calendrier", "agenda"],
  "/my-day": ["ma journee", "terrain", "intervention du jour"],
  "/billing": ["facture", "factures", "facturation"],
  "/settings/integrations": ["integration", "integrations", "pennylane", "qonto", "connecter"],
  "/settings/case-templates": ["modele", "modeles", "template"],
  "/settings/prestations": ["prestation", "prestations", "catalogue"],
  "/settings/profiles": ["profil", "profils"],
  "/organization": ["organisation", "entreprise", "siret"],
  "/subscription": ["abonnement", "essai", "stripe"],
  "/account": ["compte", "mot de passe", "profil perso"],
  "/fleet/technicians": ["technicien", "techniciens"],
  "/fleet/teams": ["equipe", "equipes"],
  "/fleet/vehicles": ["vehicule", "vehicules", "flotte"],
  "/stock": ["stock", "mouvement"],
  "/reporting": ["reporting", "rapport", "rapports", "stats"],
  "/contracts": ["contrat", "contrats", "maintenance"],
  "/order-givers": ["donneur", "donneurs", "ordre"],
  "/order-givers/new": ["nouveau donneur"],
  "/search": ["rechercher", "recherche"],
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
      "1. Menu Suivi → Planning.\n2. Choisissez la vue jour / semaine / mois ; cliquez une intervention pour le détail.",
    "/my-day":
      "1. Menu Suivi → Ma journée.\n2. Ouvrez une intervention pour démarrer, photos, signature, clôture.",
    "/billing":
      "1. Ouvrez Facturation pour le suivi.\n2. Les devis se créent depuis la fiche d’un dossier ; les intégrations sont dans Paramètres → Intégrations.",
    "/settings/integrations":
      "1. Paramètres → Intégrations.\n2. Choisissez Pennylane, Qonto ou le mode démo (essai), puis suivez la connexion.",
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
