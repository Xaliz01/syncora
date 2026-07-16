# Planwise — Vision produit & roadmap

> Document de référence pour l’équipe et les assistants de développement.  
> Complète `planwise.product.config.yml` (entités, auth) par le **pourquoi**, la **cible** et le **cap** des évolutions.  
> Dernière mise à jour : juin 2026.

---

## 1. Vision

**Planwise** est un outil SaaS qui aide les **artisans et TPE** à organiser leur activité terrain : clients, dossiers, interventions, équipes et stock léger — sans la complexité des gros logiciels FSM ou ERP.

**Promesse** : _« Je sais quoi faire aujourd’hui, pour qui, avec qui, et je peux le prouver au client. »_

**Ce que nous ne sommes pas (à court terme)** :

- Un CRM commercial généraliste (pipeline marketing, scoring leads).
- Un ERP complet (compta, paie, achats fournisseurs).
- Une solution ETI avec SSO, multi-sites internationaux et intégrations lourdes dès le jour 1.

**Ce que nous visons** :

- Un **hub opérationnel** simple : bureau (planification, suivi) + terrain (exécution, preuves) pour **2 à ~15 personnes**.
- Un prix d’entrée accessible (offre **Essentiel**), des addons optionnels quand la valeur est claire.

---

## 2. Cible prioritaire : artisans & TPE

### Profils types

| Profil                          | Taille | Besoin dominant                                                            |
| ------------------------------- | ------ | -------------------------------------------------------------------------- |
| Artisan solo ou duo             | 1–2    | Ne pas oublier les RDV, garder l’historique client, facturer ailleurs      |
| TPE services terrain            | 3–8    | Planifier la semaine, répartir entre techniciens, suivre le stock consommé |
| Petite entreprise multi-équipes | 8–15   | Visibilité retard / charge, permissions, documents chantier                |

### Métiers visés (non exhaustif)

Plomberie, chauffage, électricité, serrurerie, climatisation, maintenance courante, dépannage, petits travaux BTP, services à domicile professionnels.

### Jobs-to-be-done (JTBD)

1. **Créer et retrouver** un dossier client rapidement (adresse, historique, pièces jointes).
2. **Planifier** les interventions (calendrier, équipe, créneau).
3. **Exécuter sur le chantier** : démarrer, noter, photos, clôturer — idéalement depuis le téléphone.
4. **Prouver** au client ce qui a été fait (rapport, signature).
5. **Piloter** depuis le bureau : retards, tâches du jour, stock consommé.
6. _(Plus tard)_ **Facturer ou exporter** vers l’outil compta déjà utilisé par l’artisan.

### Critères de succès produit (TPE)

- **Mise en route < 1 journée** sans consultant.
- **Mobile-first** pour le technicien (pas seulement un back-office desktop).
- **Peu de champs obligatoires** ; valeurs par défaut intelligentes.
- **Français**, conformité RGPD de base, hébergement et support crédibles.
- **Prix prévisible** : forfait organisation + utilisateurs supplémentaires, pas de surprise à 50 €/user comme les FSM enterprise.

---

## 3. Positionnement marché

| Concurrent type            | Exemples                  | Écart Planwise aujourd’hui                | Opportunité                                  |
| -------------------------- | ------------------------- | ----------------------------------------- | -------------------------------------------- |
| FSM / GMAO lourds          | Praxedo, Commusoft        | Mobile terrain, facturation, intégrations | Simplicité + prix pour 2–8 users             |
| Outils terrain formulaires | Kizeo Forms               | Dossiers, planning, stock intégré         | Moins de silos qu’« app formulaire + Excel » |
| CRM généralistes           | HubSpot, Pipedrive        | Interventions, flotte, stock              | Rester **opérations**, pas marketing         |
| Artisans « bricolage »     | Agenda + WhatsApp + Excel | Centralisation, historique, permissions   | Devenir le **seul outil métier** léger       |

**Positionnement actuel** : excellent **back-office opérationnel** (dossiers, planning, flotte, stock simple, permissions).  
**Gap principal vs promesse TPE** : boucle **terrain** (mobile, preuve client) et boucle **revenus** (devis / export compta) encore incomplètes.

---

## 4. État actuel du produit (baseline)

Référence technique : landing `apps/frontend/components/landing/LandingPage.tsx`, configs `planwise.*.yml`, catalogue `@planwise/shared`.

### Déjà livré (socle Essentiel)

- **Organisations** multi-tenant, utilisateurs, invitations, profils de permissions granulaires.
- **Clients** : personne physique / morale, adresse, coordonnées, notes.
- **Dossiers** : statuts, priorités, échéances, modèles paramétrables (étapes, tâches, règles dashboard), historique, assignation.
- **Interventions** : liées aux dossiers, statuts (`planned`, `in_progress`, `completed`, `cancelled`), calendrier (semaine / mois), drag-and-drop, actions terrain (démarrer/terminer avec géolocalisation), **photos terrain** rattachées à l'intervention.
- **Terrain mobile** : vue « Ma journée » (interventions du jour, filtres technicien, auto-refresh), identification automatique du technicien connecté.
- **Flotte** : véhicules, techniciens, équipes, agences ; lien équipe ↔ véhicule.
- **Stock** : articles, mouvements, alertes stock bas, consommation sur intervention ; **emplacements** entrepôt / agence / véhicule avec transferts et prélèvement depuis le camion (défaut équipe → véhicule).
- **Documents** : pièces jointes dossier et intervention (images, PDF), quota 10 Go, addon stockage +50 Go.
- **Pilotage** : tableau de bord (stats cliquables, tâches à faire), recherche globale, notifications in-app.
- **Abonnement** : Stripe (essai 15 j, 2 users inclus, addons users / suggestion équipe / stockage).
- **Statut de facturation** : « À facturer » / « Facturé » / « Payé » sur dossiers et interventions, historique, filtre liste et dashboard.
- **Addon** : suggestion intelligente d’équipe (distance, trajet, carburant, CO₂ — géocodage adresses).
- **Support** : Crisp (chat).

### Limites connues (à assumer dans la com’)

- Application **web PWA** (installable, cache offline des listes du jour) ; pas d’app native.
- **Une adresse** par client ; pas de multi-sites ni d’équipements installés.
- Pas de **devis / facturation** métier intégrés.
- Pas de **portail client** ni SMS automatiques métier (email et push PWA opérationnels).
- Pas de listes de **pièces fréquentes** par type d’intervention (phase 4.2) ni scan code-barres.
- Clôture intervention depuis le bureau ou le mobile (photos terrain OK) ; **signature client** et **rapport PDF** disponibles sur intervention terminée.
- Pas d’**API publique** partenaires ni d’automatisations type workflow builder.

---

## 5. Principes de conception (artisans / TPE)

Ces principes guident toute évolution ; en cas de doute, ils priment sur « faire comme Praxedo ».

1. **Simplicité d’abord** — Moins d’écrans, moins de jargon. Un artisan doit comprendre sans formation.
2. **Mobile terrain prioritaire** — Toute feature « intervention » doit être utilisable au chantier (responsive minimum, PWA / app ensuite).
3. **Valeur jour 1** — Le socle doit rester utile sans addons ni intégrations.
4. **Addons = levier clair** — Routing intelligent, users, stockage : optionnels, bénéfice explicite sur la landing.
5. **Ne pas réinventer la compta** — Export / lien vers Pennylane, Sage, Excel plutôt qu’un module compta complet (phase tardive).
6. **Évolutivité technique** — Contrats `@planwise/shared`, permissions, isolation `organizationId` : ne pas casser pour aller vite sur l’UI.
7. **Tests sur les parcours** — Nouveau parcours utilisateur → test E2E Playwright (voir `.cursor/rules/planwise.mdc`).

---

## 6. Roadmap par phases

Les phases sont ordonnées pour la **cible artisans / TPE**. Les items peuvent être découpés en issues/PRs indépendantes. Statuts : `✅` livré · `🟡` en cours / partiel · `⬜` à faire.

### Phase 0 — Socle opérationnel bureau `✅`

Objectif : remplacer Excel + agenda partagé pour le suivi interne.

- Dossiers, modèles, tâches, historique, documents
- Interventions + calendrier
- Clients, flotte, stock léger, permissions, abonnement
- Dashboard, recherche, notifications in-app

### Phase 1 — Terrain TPE (priorité haute) `✅`

Objectif : le technicien clôture sa journée **sur le téléphone** ; le patron a une preuve client.

| #   | Évolution                                                                                 | Pourquoi (TPE)                           | Statut |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------- | ------ |
| 1.1 | **Vue « Ma journée »** mobile (interventions du jour, filtres technicien)                 | Usage quotidien chantier                 | ✅     |
| 1.2 | Actions terrain : **Démarrer / Terminer** intervention (horodatage, option géoloc légère) | Traçabilité simple                       | ✅     |
| 1.3 | **Photos** rattachées à l'intervention (pas seulement au dossier)                         | Preuve travaux                           | ✅     |
| 1.4 | **Signature client** + génération **PDF rapport** d'intervention                          | Confiance client, litiges                | ✅     |
| 1.5 | **PWA** (installable, cache minimal des listes du jour)                                   | Artisans sans « app store » obligatoire  | ✅     |
| 1.6 | Notifications **push PWA** + préférences multi-canal (in-app, email, push)                | Rappels terrain, paramétrage utilisateur | ✅     |

_Hors scope phase 1_ : GPS temps réel permanent, portail client self-service.

### Phase 2 — Clients & adresses (TPE multi-chantiers) `✅`

Objectif : un client pro avec plusieurs lieux d’intervention.

| #   | Évolution                                                                           | Pourquoi (TPE)                        |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------- |
| 2.1 | **Sites / adresses** multiples par client (dont adresse d’intervention sur dossier) | Chantiers ≠ siège social              |
| 2.2 | **Contacts** optionnels (nom, rôle, téléphone)                                      | Appeler le bon interlocuteur sur site |
| 2.3 | Enrichir **suggestion d’équipe** avec adresse d’intervention du dossier             | Déjà différenciant ; plus juste       |

### Phase 3 — Revenus légers (sans devenir ERP) `🟡`

Objectif : boucler avec l’outil compta existant de l’artisan.

| #   | Évolution                                                           | Pourquoi (TPE)        | Statut |
| --- | ------------------------------------------------------------------- | --------------------- | ------ |
| 3.1 | **Devis simple** (lignes, TVA, PDF) lié au dossier                  | Avant intervention    | ✅     |
| 3.2 | **Export** dossier / intervention (CSV, PDF)                        | Saisie compta externe | ✅     |
| 3.3 | **Intégration** 1ère brique compta FR (à choisir : Pennylane, etc.) | Réduire double saisie | ⬜     |
| 3.4 | Statut métier « **À facturer** » sur dossier / intervention         | Pont vers compta      | ✅     |

_Hors scope phase 3_ : gestion complète des paiements, relances, compta générale.

### Phase 4 — Stock & logistique artisan `🟡`

Objectif : stock utile sans WMS enterprise.

| #   | Évolution                                              | Pourquoi (TPE)        | Statut |
| --- | ------------------------------------------------------ | --------------------- | ------ |
| 4.1 | Stock par **agence** ou **véhicule** (simplifié)       | Pièces dans le camion | ✅     |
| 4.2 | Liste de **pièces fréquentes** par type d’intervention | Saisie rapide         | ⬜     |
| 4.3 | _(Optionnel)_ scan code-barres                         | Gros volumes pièces   | ⬜     |

### Phase 5 — Croissance & différenciation `⬜`

Objectif : monter en gamme sans perdre la simplicité TPE.

| #   | Évolution                                                  | Notes                                |
| --- | ---------------------------------------------------------- | ------------------------------------ |
| 5.1 | **Maintenance récurrente** (contrats, échéances)           | Cible chauffage / contrats entretien |
| 5.2 | **SMS** client (rappel RDV, « en route »)                  | Complément email                     |
| 5.3 | Optimisation **tournée journée** (plusieurs interventions) | Extension addon routing              |
| 5.4 | **API / webhooks** documentés                              | Intégrateurs, partenaires            |
| 5.5 | **Rapports** (interventions / semaine, retard, stock)      | Pilotage patron                      |
| 5.6 | Offre **Pro** (palier prix, plus de users / stock)         | Alignement valeur / prix             |

### Hors roadmap explicite (sauf pivot)

- SSO / SAML enterprise
- Marketplace d’intégrations large
- GMAO lourde (arbres d’équipements, nomenclatures industrielles)
- Portail client self-service complet
- Application native iOS/Android _(à réévaluer si PWA insuffisante)_

---

## 7. Modèle économique (rappel)

Aligné sur `packages/shared/src/subscription.ts` :

| Élément                          | Valeur                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| **Essentiel**                    | 9,99 € / mois / organisation, **2 utilisateurs** inclus, essai 15 j |
| Utilisateur supplémentaire       | 2,99 € / mois / user                                                |
| Suggestion intelligente d’équipe | 4,99 € / mois                                                       |
| Stockage supplémentaire          | 4,99 € / mois / +50 Go                                              |
| Stockage inclus                  | 10 Go, limite 10 Mo / fichier                                       |

**Stratégie prix (TPE)** : rester **10× moins cher** qu’un FSM par utilisateur tant que la boucle terrain + revenus n’est pas complète ; réviser à la **Phase 3–5** quand la valeur perçue couvre planning + terrain + export compta.

---

## 8. Utilisation de ce document

### Pour les développeurs & assistants IA

1. Lire ce fichier **avant** une feature ou un refactor produit.
2. Vérifier que la demande correspond à la **phase** courante (éviter le scope enterprise en Phase 1).
3. Croiser avec :
   - `planwise.product.config.yml` — entités et auth
   - `planwise.tech.config.yml` — stack et services
   - `planwise.ui.config.yml` — design system
4. Mettre à jour les sections **État actuel** et **Roadmap** quand une phase est livrée (date + statut `✅`).

### Definition of Done (feature produit)

- Alignée avec les **principes §5** et la **cible TPE §2**.
- Permissions + isolation `organizationId` si donnée métier.
- Tests unitaires backend sur la logique ; E2E si nouveau parcours UI.
- Pas de sur-promesse sur la landing sans baseline code.

---

## 9. Fichiers liés

| Fichier                                            | Rôle                          |
| -------------------------------------------------- | ----------------------------- |
| `planwise.product.config.yml`                      | Entités cœur, auth, capacités |
| `planwise.tech.config.yml`                         | Stack, microservices, CI      |
| `planwise.ui.config.yml`                           | UI slate + brand              |
| `packages/shared/src/subscription.ts`              | Catalogue offre & addons      |
| `apps/frontend/components/landing/LandingPage.tsx` | Message marché public         |
| `.cursor/rules/planwise.mdc`                       | Règles dev & tests            |

---

_Ce document est vivant : privilégier des mises à jour courtes à chaque jalons plutôt qu’une réécriture complète._
