/** Connaissance produit embarquée (alignée sur docs/product/) — disponible en Docker. */

export interface ProductDocChunk {
  id: string;
  title: string;
  text: string;
  /** Préfixes de pathname qui boostent ce chunk (page courante). */
  pathPrefixes?: readonly string[];
}

export const PRODUCT_DOC_CHUNKS: readonly ProductDocChunk[] = [
  {
    id: "about",
    title: "À propos / éditeur",
    text: `Qui a développé Planwise ? Planwise est développé et édité par Benoist Babin, entrepreneur individuel (SIREN 979 102 803), à Landerneau (Finistère, France). Nom commercial Planwise. Contact : contact@planwise.fr. Site : https://planwise.fr. Créateur, fondateur, éditeur, développeur = Benoist Babin. Planwise est un CRM terrain pour artisans, indépendants et TPE (clients, dossiers, planning, interventions, devis, facturation connectée). Mentions légales sur le site marketing. Pendant la beta, Planwise reste gratuit ; essai sans carte bancaire.`,
  },
  {
    id: "routes",
    title: "Catalogue des menus",
    text: `Menus principaux Planwise (ne jamais inventer d'écran) :
Tableau de bord (/) ; Ma journée (/my-day) ; Dossiers (/cases) ; Nouveau dossier (/cases/new) ; Planning (/cases/calendar) ; Contrats (/contracts) ; Nouveau contrat (/contracts/new) ; Mouvements de stock (/stock) ; Reporting (/reporting) ; Facturation (/billing) ; Clients (/customers) ; Nouveau client (/customers/new) ; Donneurs d'ordre (/order-givers) ; Utilisateurs (/users) ; Inviter (/users/new) ; Équipes (/fleet/teams) ; Techniciens (/fleet/technicians) ; Véhicules (/fleet/vehicles) ; Agences (/fleet/agences) ; Catalogue articles (/settings/stock/articles) ; Nouvel article (/settings/stock/articles/new) ; Prestations (/settings/prestations) ; Nouvelle prestation (/settings/prestations/new) ; Emplacements stock (/settings/stock/locations) ; Nouvel emplacement (/settings/stock/locations/new) ; Modèles de dossier (/settings/case-templates) ; Types d'intervention (/settings/intervention-types) ; Nouveau type d'intervention (/settings/intervention-types/new) ; Profils (/settings/profiles) ; Notifications (/settings/notifications) ; Intégrations (/settings/integrations) ; Import de données (/settings/data-import) ; Recherche (/search) ; Mon organisation (/organization) ; Mon abonnement (/subscription) ; Mon compte (/account).
Fiches détail dynamiques (/cases/:id, /customers/:id…) : ne pas inventer d'ID — guider vers la liste puis ouvrir depuis la liste. Modification dossier : depuis la fiche, bouton Modifier → /cases/:id/edit (permission cases.update).
Sans abonnement actif, le menu est réduit (org / abonnement / compte). Favoris = barre sous le header (étoile ★ ou glisser un lien du menu). Historique de navigation = icône horloge près des favoris (pages récentes). Cloche = inbox notifications. Reporting détail : passer par le hub /reporting.`,
  },
  {
    id: "glossary",
    title: "Glossaire",
    text: `Organisation = locataire / entreprise (isolation des données). SIRET/SIREN = identifiants FR à l'inscription / création d'org. Dossier = affaire / chantier (n° auto YYYY-0001, libellé « n° - client »). Modèle de dossier = template (import métiers). Intervention = créneau terrain. Technicien = ressource assignable ; peut être liée à un utilisateur. Équipe = groupe de techniciens assignable. Agence = base / site. Véhicule = flotte (immat, km). Ma journée = interventions du jour du technicien lié. Planning = calendrier. Client = bénéficiaire chantier. Donneur d'ordre = tiers facturé si ≠ client. Contrat maintenance = récurrent ; modes « à programmer avec le client » ou « auto-planifier ». Article = stock ; prestation = ligne devis (≠ stock). Emplacement / mouvement de stock. Import de données = charger d'anciennes données via CSV (/settings/data-import) ; externalId = clé de l'ancien outil pour lier les fichiers. Facturation = sync outil connecté — Planwise ne facture pas seul. Intégration = OAuth (une active). Profil = droits non-admin. Favoris = barre ★. Historique navigation = horloge (pages récentes). Essai/démo = ~15 j, données injectables. Abonnement Essentiel = accès produit Stripe ≠ facturation clients. Quota stockage documents = limite d'espace (10 Go inclus, +50 Go/addon), pas un nombre max de fichiers. Addon = suggestion d'équipe, users, stockage. Reporting = exports. PWA = app installable + hors-ligne. Assistant IA inclus au socle.`,
  },
  {
    id: "journey-import-crm",
    title: "Import de données (CSV)",
    pathPrefixes: ["/settings/data-import"],
    text: `Import de données : Paramètres → Import de données (/settings/data-import). Droits data_import.read / data_import.run. CSV UTF-8 séparateur ; (Excel FR), max 20 Mo / 25000 lignes. Importez chaque type quand vous voulez : pas d'ordre global. Règle simple : si une ligne parle d'une autre fiche, cette fiche doit déjà être dans Planwise (ex. sites après les clients, interventions après les dossiers). Articles, prestations et donneurs d'ordre : aucun autre fichier n'est requis avant. Colonne externalId obligatoire (clé ancien CRM) ; ré-import = mise à jour. Dossiers : pas de colonne titre — numéro Planwise auto YYYY-0001 + titre d'affichage « n° - client » ; externalId = clé de liaison ; reference = champ libre optionnel. Section « Convertir mon export » : correspondance assistée des colonnes d'un export tiers vers le format Planwise (IA si clé LLM, sinon heuristique), puis téléchargement CSV à valider/importer. Historique des imports : annuler un lot = suppression définitive des fiches créées par ce lot (pas les mises à jour, pas de cascade). Modèles téléchargeables /import-templates/*.csv. Interventions historiques : status completed avec completedAt, types créés auto si typeName inconnu. Assignation via assigneeEmail ou teamName (utilisateurs/équipes déjà dans Planwise). Pas d'import photos/factures/signatures en V1. Ne pas confondre avec l'injection de données de démo (essai).`,
  },
  {
    id: "journey-favorites",
    title: "Mettre une page en favori",
    pathPrefixes: ["/"],
    text: `Oui, Planwise a des favoris intégrés (ce n'est PAS les favoris du navigateur). Barre de raccourcis sous l'en-tête.
Comment faire : 1) Ouvrir la page. 2) Cliquer l'étoile (★) dans la barre. 3) Ou glisser un lien du menu latéral vers la barre. 4) Retirer : recliquer l'étoile.
Historique de navigation (pages récentes) : icône horloge à côté des favoris — ce n'est pas la même chose. Pas de page menu « Favoris ».`,
  },
  {
    id: "journey-nav-history",
    title: "Historique de navigation",
    pathPrefixes: ["/"],
    text: `Historique de navigation Planwise : bouton horloge près de la barre de favoris (sous le header). Affiche les pages récentes (stockage local, par utilisateur + organisation, ~50 max). Ignoré : login, register, onboarding, platform, page hors-ligne. Ce n'est PAS les favoris (étoile ★) ni une entrée du menu latéral. Recherche globale : champ header → /search.`,
  },
  {
    id: "journey-assign-intervention",
    title: "Assigner une intervention (technicien / utilisateur)",
    pathPrefixes: ["/fleet/technicians", "/fleet/teams", "/cases/calendar", "/my-day"],
    text: `Règle : on n'assigne PAS un utilisateur directement sur une intervention. On assigne un technicien (ou une équipe). Pour qu'un utilisateur voie l'intervention dans Ma journée et reçoive les notifications, un technicien doit être lié à son compte.
Lier utilisateur ↔ technicien : 1) Créer un technicien (Gestion → Techniciens /fleet/technicians) ou « Créer un technicien associé » depuis la fiche utilisateur (/users). 2) Sur la fiche technicien : lier un compte, ou inviter. 3) Optionnel : équipe (/fleet/teams).
Assigner : dossier (/cases) ou Planning (/cases/calendar) → choisir soit une équipe, soit un technicien (pas les deux). L'utilisateur lié voit Ma journée (/my-day) le jour prévu.
Erreurs : utilisateur absent de la liste d'assignation → normal (liste = techniciens). Ma journée vide → pas de lien technicien. Pas de notifs → technicien sans compte lié.`,
  },
  {
    id: "journey-invite-user",
    title: "Inviter un utilisateur",
    pathPrefixes: ["/users"],
    text: `Objectif : ajouter un membre via invitation e-mail. Prérequis : permission users.invite, abonnement actif.
Étapes : 1) Gestion → Utilisateurs (/users), puis Inviter, ou /users/new. 2) E-mail et profil / droits (/settings/profiles). 3) Envoyer l'invitation.
Après : pour le terrain, créer ou lier un technicien. Assignation d'intervention = sur le technicien, pas l'utilisateur.`,
  },
  {
    id: "journey-client",
    title: "Créer un client",
    pathPrefixes: ["/customers"],
    text: `Objectif : enregistrer un client (particulier ou entreprise) pour les dossiers. Prérequis : customers.create.
Étapes : 1) Gestion → Clients (/customers) ou /customers/new. 2) Type, nom, contacts, adresse. 3) Enregistrer ; sites d'intervention sur la fiche.
Facturer un autre tiers → donneur d'ordre (/order-givers/new).`,
  },
  {
    id: "journey-order-givers",
    title: "Donneurs d'ordre",
    pathPrefixes: ["/order-givers"],
    text: `Donneur d'ordre = tiers facturé quand ce n'est pas le client chantier. Menu Gestion → Donneurs d'ordre (/order-givers), création /order-givers/new. Sur un dossier, sélectionner le donneur d'ordre pour la facturation / sync Pennylane-Qonto-démo. Ne pas confondre avec le client (bénéficiaire / site).`,
  },
  {
    id: "journey-case",
    title: "Créer un dossier",
    pathPrefixes: ["/cases"],
    text: `Objectif : ouvrir un dossier (affaire) avec éventuellement un modèle. Prérequis : cases.create ; idéalement un client.
Étapes : 1) Suivi → Dossiers (/cases) puis Nouveau, ou /cases/new. 2) Client, donneur d'ordre si besoin (pas de titre libre : n° auto YYYY-0001 + libellé « n° - client »). 3) Modèle de dossier (/settings/case-templates, import métiers possible). 4) Fiche : étapes, tâches, interventions, documents, devis, stock consommé. 5) Modifier le dossier : bouton Modifier sur la fiche → /cases/:id/edit.
Suite : planifier une intervention, devis, facturer via intégration.`,
  },
  {
    id: "journey-my-day",
    title: "Ma journée et intervention",
    pathPrefixes: ["/my-day"],
    text: `Objectif : interventions du jour, démarrer/clôturer, photos, signature, PDF. Prérequis : interventions.read ; compte lié à un technicien.
Étapes : 1) Suivi → Ma journée (/my-day). 2) Ouvrir l'intervention. 3) Démarrer, photos, notes. 4) Signature client, terminer. 5) Rapport PDF si proposé.
Commandes vocales (expérimental, opt-in Mon compte, sur mobile) : sur Ma journée, si désactivées, un bandeau propose l’activation. Écoute mains libres — dire « Planwise » ou « Plan » puis « démarre », « termine » (confirmation : dire « oui » ou « terminer », ou « annuler » ; si plusieurs interventions en cours → choix), « note que … », « prochaine », « ouvre le dossier » (ou « Planwise démarre » / « Plan démarre »). Cible inline possible : « termine la première », « démarre Intervention démo », « ajoute un commentaire à la deuxième ». Bouton micro = couper/reprendre ou autoriser le micro une fois si le navigateur le demande. Distinct de l'assistant guide (Aide). SpeechRecognition requis.
Liste vide = pas d'assignation aujourd'hui, mauvais technicien, ou technicien non lié. Vue équipe : Planning /cases/calendar.`,
  },
  {
    id: "journey-planning",
    title: "Planning",
    pathPrefixes: ["/cases/calendar"],
    text: `Objectif : voir et réorganiser les interventions (jour/semaine/mois). Prérequis : cases.read.
Étapes : 1) Suivi → Planning (/cases/calendar). 2) Vue. 3) Glisser-déposer si autorisé. 4) Clic → détail / dossier. 5) Filtres équipe/technicien.
Assignation : technicien ou équipe (pas utilisateur). Terrain du jour : /my-day.`,
  },
  {
    id: "journey-billing",
    title: "Devis et facturation",
    pathPrefixes: ["/billing", "/settings/prestations"],
    text: `Règle : Planwise NE FACTURE PAS tout seul. Devis (PDF, lignes, TVA) dans Planwise sur un dossier. Factures via outil CONNECTÉ : Pennylane, Qonto, ou mode démo essai. Sans intégration : devis OK, pas de vraie facture.
Étapes : 1) /settings/integrations (une seule intégration facturation active). 2) Dossier → devis. 3) Facturer via l'outil. 4) Suivi /billing.
Prestations catalogue : /settings/prestations. Abonnement Planwise (/subscription) ≠ facturation clients.`,
  },
  {
    id: "journey-integrations",
    title: "Connecter une intégration",
    pathPrefixes: ["/settings/integrations"],
    text: `Lier Planwise à Pennylane, Qonto ou mode démo (essai) — requis pour facturer. Paramètres → Intégrations (/settings/integrations). OAuth ou clé selon l'écran. Une seule facturation active à la fois. Escalade Crisp si erreur OAuth ou outil absent.`,
  },
  {
    id: "journey-contracts",
    title: "Contrats de maintenance",
    pathPrefixes: ["/contracts"],
    text: `Contrats récurrents : Suivi → Contrats (/contracts), création /contracts/new (contracts.create).
Champs : client, site, modèle de dossier, récurrence (mois), prochaine visite, statut draft/active/suspended/ended.
Modes de planification : 1) « À programmer avec le client » — rappel 7/14/30 j avant ; vous posez le créneau (schedulingPending ; filtre /contracts?filter=to_schedule ; bloc Visites à programmer sur le tableau de bord). 2) « Auto-planifier à l'échéance » — crée automatiquement dossier + intervention.
Contrat brouillon / suspendu / terminé ne génère pas. Fiche /contracts/:id : programmer une visite, historique.`,
  },
  {
    id: "journey-stock",
    title: "Stock et prestations",
    pathPrefixes: ["/stock", "/settings/stock", "/settings/prestations"],
    text: `Stock physique ≠ prestations devis.
Mouvements : /stock (entrées, sorties, ajustements, transferts ; stock.movements.read). Catalogue articles : /settings/stock/articles. Emplacements : /settings/stock/locations (souvent véhicule/agence). Sur dossier/intervention : articles consommés.
Prestations (/settings/prestations) = lignes devis/facture, pas le stock. Flotte liée : /fleet/vehicles, /fleet/agences.`,
  },
  {
    id: "journey-onboarding-demo",
    title: "Onboarding et données de démo",
    pathPrefixes: ["/onboarding", "/"],
    text: `Après inscription, le fondateur admin peut passer par /onboarding : profil « je vais sur le terrain » (peut créer/lier un technicien), puis injecter ou ignorer les données de démo. Ensuite modal guide de démarrage (créer client, dossier, inviter, démo, connecter facturation) — skippable.
Essai ~15 jours sans CB. Injection démo aussi depuis le tableau de bord (carte Trial, admins, status trialing) : clients/dossiers « Démo », articles, techniciens, équipes… Statut injecting → ready ; purge manuelle ou auto fin d'essai. Pas une entrée menu. /onboarding déjà fait → renvoi vers /.`,
  },
  {
    id: "journey-dashboard",
    title: "Tableau de bord",
    pathPrefixes: ["/"],
    text: `Accueil / : stats dossiers (assignés, en cours, terminés semaine, en retard) si cases.read — clic ouvre une modale, pas une route dédiée. Widgets todos issus des modèles de dossier. Visites à programmer (contrats) → /contracts?filter=to_schedule. Listes dossiers actifs / interventions du jour. Carte données de démo en essai. Sans cases.read : page légère.`,
  },
  {
    id: "journey-profiles-templates",
    title: "Profils, modèles de dossier et types d'intervention",
    pathPrefixes: [
      "/settings/profiles",
      "/settings/case-templates",
      "/settings/intervention-types",
    ],
    text: `Profils (/settings/profiles) : ensembles de permissions pour membres non admin ; choisis à l'invitation (/users/new) ; import librairie possible. Admin org = tous les droits. « Je ne vois pas un menu » = permission manquante ou abonnement inactif.
Modèles de dossier (/settings/case-templates) : étapes/tâches/widgets ; import modèles métiers (plomberie, électricité…) ; choisis à /cases/new. Préférer Profils à /settings/permissions (hors menu principal).
Types d'intervention (/settings/intervention-types) : catalogue org (Pose / SAV importables, couleur) ; sélection optionnelle à la création d'une intervention (non modifiable ensuite) ; filtre « Tous » sur le reporting Liste des interventions.`,
  },
  {
    id: "journey-notifications",
    title: "Notifications",
    pathPrefixes: ["/settings/notifications"],
    text: `Cloche header = inbox in-app. Préférences : Paramètres → Notifications (/settings/notifications) — canaux in-app / e-mail / push ; types d'événements (assignation, rappels intervention, signatures, dossiers, visite maintenance…) ; délai rappel intervention.
Push : Service Worker + autorisation navigateur. Si refusé : réactiver manuellement (Chrome cadenas, Safari iOS après « Sur l'écran d'accueil »). Pas de notif terrain si technicien non lié au compte.`,
  },
  {
    id: "journey-subscription",
    title: "Abonnement, essai et addons",
    pathPrefixes: ["/subscription"],
    text: `Mon abonnement /subscription : plan Essentiel 9,99 €/mois, 2 users inclus, 10 Go docs, essai ~15 j. Addons : suggestion intelligente d'équipe (~4,99 €, inclus en essai), utilisateurs (+2,99 €), stockage +50 Go (4,99 €). Assistant IA + Crisp inclus au socle.
Sans accès actif : menu réduit org/abonnement/compte. Abonnement Stripe Planwise ≠ facturation clients (Pennylane/Qonto/démo). Tunnel Stripe complexe → Crisp.`,
  },
  {
    id: "journey-document-storage",
    title: "Limite documents et quota de stockage",
    pathPrefixes: ["/subscription"],
    text: `Question fréquente : limite du nombre de documents / fichiers / photos / PDF à déposer ?
Réponse : il n'y a PAS de plafond sur le nombre de documents. La limite est un QUOTA D'ESPACE (octets) pour toute l'organisation.
Inclus Essentiel : 10 Go de stockage documents (ordre de grandeur ≈ 10 000 photos ou PDF). Addon stockage supplémentaire : +50 Go par unité (~4,99 €/mois).
Où voir / augmenter : Mon abonnement (/subscription) — barre d'usage utilisé/quota, alerte vers 80 %, upload bloqué si quota atteint.
Documents déposés sur les fiches dossier. Ne jamais dire « aucune limite » ni inventer un nombre max de fichiers. Ne pas confondre avec le stock articles (pièces) : ici = fichiers/documents.`,
  },
  {
    id: "journey-reporting",
    title: "Reporting",
    pathPrefixes: ["/reporting"],
    text: `Suivi → Reporting (/reporting, exports.reporting pour le menu). Cartes selon permissions : dossiers, interventions, activité techniciens, kilométrique (GPS/CO₂), clients, utilisateurs, factures. Consulter en tableau puis export Excel/CSV/PDF. Guider vers /reporting puis choisir la carte — ne pas inventer de liens /reporting/:type dans les suggestions whitelist. Période souvent plafonnée (~2 ans).`,
  },
  {
    id: "journey-search",
    title: "Recherche",
    pathPrefixes: ["/search"],
    text: `Champ recherche header → /search?q=… Types : dossiers, interventions, clients, donneurs d'ordre, véhicules, techniciens, équipes, agences, articles, prestations, utilisateurs (filtrés par droits). Pas d'entrée sidebar. Résultats vides = query courte, permissions, ou org vide (proposer démo en essai).`,
  },
  {
    id: "journey-organization",
    title: "Organisation",
    pathPrefixes: ["/organization"],
    text: `Mon organisation /organization : nom, e-mail, téléphone, adresse, logo (organizations.update). Switcher sidebar pour multi-org ; création via recherche SIRET/SIREN/nom. Isolation stricte organizationId — changer d'org « vide » les listes de l'autre (attendu). Assistant ne lit pas les données org.`,
  },
  {
    id: "journey-account-pwa",
    title: "Mon compte et application (PWA)",
    pathPrefixes: ["/account"],
    text: `Mon compte /account : identité, mot de passe, thème clair/sombre, sidebar, sessions, liens légaux. Thème aussi via toggle header.
Mot de passe oublié (hors session) : depuis Connexion → Mot de passe oublié ? → e-mail avec lien /reset-password (1 h, usage unique) ; les sessions ouvertes sont déconnectées. Changement de mot de passe connecté reste dans Mon compte.
PWA : installable (standalone) ; Service Worker ; page hors connexion /~offline. Pas d'app store native. Ne pas promettre édition métier offline complète. Assistant « offline » (sans LLM) = catalogue sans IA, distinct du hors-réseau navigateur. Push : voir Notifications.`,
  },
  {
    id: "journey-fleet",
    title: "Flotte véhicules et agences",
    pathPrefixes: ["/fleet/vehicles", "/fleet/agences", "/fleet/teams", "/fleet/technicians"],
    text: `Section menu Gestion (URLs /fleet/…) : Équipes, Techniciens, Véhicules (/fleet/vehicles — immat, type, km, statut), Agences (/fleet/agences — bases/sites). Véhicule peut porter un emplacement de stock. Assignation intervention : voir parcours technicien (équipe OU technicien). Reporting km utilise souvent agence → chantier.`,
  },
  {
    id: "rules",
    title: "Règles assistant",
    text: `Répondre en français, vouvoiement. « Comment faire » : intro courte puis étapes numérotées CHACUNE SUR SA LIGNE (1. / 2. / 3. avec retours à la ligne — jamais « 1) … 2) … » collés). Menus exacts, puis 1–3 liens whitelist. Notifications = Paramètres → Notifications (/settings/notifications), pas Mon compte. Documents : pas de limite en nombre de fichiers ; quota d'espace 10 Go inclus (+50 Go addon), voir /subscription — ne jamais dire « aucune limite ». Facturation clients : outil connecté (Pennylane, Qonto, démo). Abonnement /subscription ≠ facturation /billing. Favoris = ★ ; historique = horloge. Assignation = technicien/équipe. Éditeur/contact = À propos. Hors périmètre → escalateToSupport. Pas d'invention d'URLs ni lecture des données org.`,
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

/** Synonymes / mots proches pour améliorer le retrieval lexical. */
const QUERY_EXPANSIONS: Record<string, readonly string[]> = {
  devis: ["devis", "quote", "facturation", "prestation", "tva", "pdf"],
  facture: ["facturation", "billing", "pennylane", "qonto", "demo", "devis"],
  facturer: ["facturation", "billing", "pennylane", "qonto", "demo", "devis", "facture"],
  facturation: ["facturation", "billing", "devis", "pennylane", "qonto", "integration"],
  planning: ["planning", "calendrier", "intervention", "calendar"],
  calendrier: ["planning", "calendrier", "intervention"],
  intervention: [
    "intervention",
    "my-day",
    "journee",
    "terrain",
    "signature",
    "planning",
    "assigner",
    "technicien",
  ],
  journee: ["journee", "my-day", "intervention", "technicien"],
  client: ["client", "customers", "particulier", "entreprise", "donneur"],
  dossier: ["dossier", "affaire", "chantier", "cases", "modele"],
  utilisateur: [
    "utilisateur",
    "users",
    "inviter",
    "invitation",
    "profil",
    "technicien",
    "assigner",
  ],
  inviter: ["inviter", "invitation", "utilisateur", "users"],
  assigner: ["assigner", "assignation", "affectation", "technicien", "intervention", "equipe"],
  assignation: ["assignation", "assigner", "technicien", "intervention", "equipe"],
  affecter: ["affecter", "affectation", "assigner", "technicien", "intervention"],
  intervenant: ["intervenant", "technicien", "assigner", "intervention"],
  integration: ["integration", "pennylane", "qonto", "oauth", "facturation"],
  pennylane: ["pennylane", "integration", "facturation"],
  qonto: ["qonto", "integration", "facturation"],
  contrat: ["contrat", "maintenance", "contracts", "visite", "auto"],
  maintenance: ["contrat", "maintenance", "contracts", "visite"],
  visite: ["visite", "contrat", "maintenance", "programmer"],
  stock: ["stock", "article", "mouvement", "emplacement"],
  article: ["article", "stock", "catalogue"],
  emplacement: ["emplacement", "stock", "vehicule", "agence"],
  prestation: ["prestation", "devis", "catalogue"],
  modele: ["modele", "template", "dossier", "case-templates", "metier"],
  metier: ["metier", "modele", "template", "import"],
  permission: ["permission", "profil", "droit", "users"],
  profil: ["profil", "permission", "droit", "profiles"],
  equipe: ["equipe", "teams", "technicien", "assigner", "suggestion"],
  technicien: [
    "technicien",
    "techniciens",
    "fleet",
    "journee",
    "intervention",
    "assigner",
    "affectation",
  ],
  favori: ["favori", "favoris", "etoile", "raccourci", "epingle", "bookmark"],
  favoris: ["favoris", "favori", "etoile", "raccourci", "epingle", "bookmark"],
  etoile: ["etoile", "favori", "favoris", "raccourci"],
  raccourci: ["raccourci", "favori", "favoris", "etoile", "historique"],
  epingle: ["epingle", "favori", "favoris", "etoile"],
  bookmark: ["bookmark", "favori", "favoris"],
  historique: ["historique", "navigation", "horloge", "recent", "favori"],
  navigation: ["navigation", "historique", "horloge", "recent"],
  horloge: ["horloge", "historique", "navigation"],
  demo: ["demo", "essai", "onboarding", "donnees", "test"],
  essai: ["essai", "demo", "abonnement", "trial", "gratuit"],
  onboarding: ["onboarding", "demarrage", "demo", "profil"],
  demarrage: ["demarrage", "onboarding", "guide", "demo"],
  abonnement: ["abonnement", "subscription", "essai", "stripe", "addon", "essentiel"],
  stripe: ["stripe", "abonnement", "subscription"],
  addon: ["addon", "suggestion", "utilisateur", "stockage", "abonnement"],
  suggestion: ["suggestion", "equipe", "addon", "tournee"],
  notification: ["notification", "notifications", "cloche", "push", "rappel", "email"],
  push: ["push", "notification", "pwa", "navigateur"],
  reporting: ["reporting", "rapport", "export", "kilometrique", "co2", "stats"],
  rapport: ["rapport", "reporting", "export"],
  kilometrique: ["kilometrique", "km", "reporting", "gps", "co2", "carburant"],
  recherche: ["recherche", "search", "trouver", "chercher"],
  organisation: ["organisation", "organization", "siret", "entreprise", "multi"],
  siret: ["siret", "siren", "organisation", "entreprise"],
  compte: ["compte", "account", "mot", "passe", "theme", "session"],
  theme: ["theme", "compte", "sombre", "clair"],
  pwa: ["pwa", "installer", "hors", "ligne", "offline", "application"],
  offline: ["offline", "hors", "ligne", "pwa", "connexion"],
  vehicule: ["vehicule", "flotte", "immat", "km", "stock"],
  agence: ["agence", "agences", "flotte", "base", "site"],
  flotte: ["flotte", "vehicule", "technicien", "equipe", "agence"],
  donneur: ["donneur", "ordre", "facturation", "tiers"],
  tableau: ["tableau", "bord", "dashboard", "stat", "visite"],
  dashboard: ["dashboard", "tableau", "bord", "stat"],
  stockage: ["stockage", "documents", "quota", "addon", "go", "limite", "fichier"],
  document: ["document", "documents", "fichier", "stockage", "quota", "go", "limite", "deposer"],
  documents: ["documents", "document", "fichier", "stockage", "quota", "go", "limite", "deposer"],
  fichier: ["fichier", "document", "documents", "stockage", "quota"],
  deposer: ["deposer", "depot", "document", "documents", "fichier", "upload", "quota"],
  limite: ["limite", "quota", "stockage", "documents", "go", "nombre"],
  quota: ["quota", "stockage", "documents", "limite", "go", "abonnement"],
};

function isAboutIntent(tokens: string[]): boolean {
  if (tokens.some((t) => ABOUT_STRONG_TOKENS.has(t))) return true;
  return (
    tokens.includes("qui") &&
    (tokens.includes("planwise") ||
      tokens.includes("developpe") ||
      tokens.includes("editeur") ||
      tokens.includes("createur") ||
      tokens.includes("fondateur"))
  );
}

function expandQueryTokens(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const t of tokens) {
    const expansions = QUERY_EXPANSIONS[t];
    if (expansions) {
      for (const e of expansions) out.add(e);
    }
  }
  return [...out];
}

function pathnameBoost(chunk: ProductDocChunk, pathname?: string): number {
  if (!pathname?.trim() || !chunk.pathPrefixes?.length) return 0;
  const path = pathname.trim().split("?")[0] || "";
  for (const prefix of chunk.pathPrefixes) {
    if (path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(prefix)) {
      // Évite que /cases matche trop fort /cases/calendar si un chunk calendar existe
      if (prefix === "/cases" && path.startsWith("/cases/calendar")) continue;
      // Accueil : ne pas tout booster via pathPrefixes ["/"]
      if (prefix === "/" && path !== "/") continue;
      return prefix.length >= 12 ? 8 : 5;
    }
  }
  return 0;
}

/**
 * Recherche lexicale : tokens + synonymes + boost page courante.
 * Épinglé : chunk « rules » si place ; about prioritaire pour intent éditeur.
 */
export function retrieveProductChunks(
  query: string,
  limit = 6,
  pathname?: string,
): ProductDocChunk[] {
  const rawTokens = tokenize(query);
  const tokens = expandQueryTokens(rawTokens);
  if (tokens.length === 0 && !pathname?.trim()) {
    return PRODUCT_DOC_CHUNKS.filter((c) => c.id === "rules" || c.id === "glossary").slice(
      0,
      Math.min(2, limit),
    );
  }

  const aboutIntent = isAboutIntent(rawTokens);

  const scored = PRODUCT_DOC_CHUNKS.map((chunk) => {
    const hay = tokenize(`${chunk.title} ${chunk.text}`);
    const haySet = new Set(hay);
    let score = pathnameBoost(chunk, pathname);
    for (const t of tokens) {
      if (haySet.has(t)) score += 2;
      else if (hay.some((h) => h.includes(t) || t.includes(h))) score += 1;
    }
    if (aboutIntent && chunk.id === "about") score += 20;
    if (chunk.id === "rules") score += 0.5; // léger biais pour garder les consignes
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const positive = scored.filter((s) => s.score > 0).slice(0, limit);
  let selected = positive.map((s) => s.chunk);

  if (selected.length === 0) {
    selected = PRODUCT_DOC_CHUNKS.filter((c) => c.id === "glossary" || c.id === "routes").slice(
      0,
      Math.min(2, limit),
    );
  }

  // Toujours inclure les règles si absentes et qu'il reste de la place
  if (!selected.some((c) => c.id === "rules") && selected.length < limit) {
    const rules = PRODUCT_DOC_CHUNKS.find((c) => c.id === "rules");
    if (rules) selected = [...selected, rules];
  }

  return selected.slice(0, limit);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9]+/u)
    .filter((t) => t.length >= 2);
}
