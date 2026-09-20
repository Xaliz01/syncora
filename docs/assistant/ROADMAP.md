# IA métier Planwise — roadmap OpenSpec

> Programme **copilote terrain** (indépendants / TPE / PME), pas un CRM commercial générique.  
> Source de vérité pour `/opsx-propose` : **une tranche = un change OpenSpec**.  
> Dernière mise à jour : septembre 2026.

**Ne pas** documenter ces capacités dans `docs/product/` / `PRODUCT_DOC_CHUNKS` **avant livraison** : l’assistant in-app ne doit pas promettre des écrans qui n’existent pas.

---

## Comment avancer avec OpenSpec

1. Choisir **une** tranche `ready` (jamais deux dans le même change).
2. Nommer le change exactement comme `Change OpenSpec` ci-dessous.
3. Lancer `/opsx-propose` (ou `openspec new change "<change>"`) en collant le bloc **Exigences** + **Scénarios** de la tranche.
4. Delta spec : `openspec/changes/<change>/specs/<capability-path>/spec.md` (`ADDED` / `MODIFIED`).
5. Après merge + archive : passer le statut à `✅`, mettre à jour `planwise.vision.md` § Phase 6, puis la doc produit (routes, glossaire, journey, chunks).

| Règle              | Détail                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Un change          | Une capability user-visible (le socle technique voyage **dans** le premier change qui en a besoin) |
| Pas de write libre | L’IA **propose** ; l’humain **valide**. Jamais d’émission facture / envoi client sans confirmation |
| Isolation          | Tools et lectures filtrés par `organizationId` + permissions existantes                            |
| Coût               | Quota tokens / org / jour ; pas d’appel LLM dans les unit tests ni les E2E CI                      |
| Hors sujet         | Scoring leads, séquences nurturing, fine-tune, marketplace de plugins IA                           |

Capability déjà spécifiée (MVP guide) : [`openspec/specs/assistant/spec.md`](../../openspec/specs/assistant/spec.md).  
Cadrage historique : [`MVP.md`](./MVP.md).

---

## Principes (primauté TPE)

1. **Gagner 20 minutes**, pas « bluffer ». Critère d’une tranche : un solo peut le dire après une journée.
2. **Invisible** : libellés « Préremplir », « Relancer », « Résumer » — pas des badges « AI » partout.
3. **Métier Planwise** : chantier → preuve → devis / relance. Pas un pipeline HubSpot.
4. **Validation humaine** sur tout ce qui sort de l’org (e-mail, SMS, facture, devis envoyé).
5. **Offline chantier** : si le LLM est injoignable, file d’attente ou message clair — pas de perte de photos / dictée.

---

## Vue d’ensemble

```text
Vague A -- differentiant essai
  A1 compte-rendu voix/photo
  A2 filet anti-oubli (A traiter)
  A3 assistant lecture org (3-4 questions)

Vague B -- revenus / quotidien
  B1 devis assiste catalogue
  B2 brief Ma journee
  B3 drafts SMS / mail (si canal 5.2)

Vague C -- wow / Pro
  C1 inbox WhatsApp/mail -> brouillon dossier
  C2 tournee expliquee (addon routing 5.3)
```

| ID  | Tranche                    | Change OpenSpec      | Capability path     | Dépend de                 | Statut |
| --- | -------------------------- | -------------------- | ------------------- | ------------------------- | ------ |
| —   | Guide produit (livré)      | —                    | `assistant`         | —                         | ✅     |
| A1  | Compte-rendu chantier      | `ai-field-report`    | `ai-field-report`   | —                         | ⬜     |
| A2  | Filet anti-oubli           | `ai-follow-ups`      | `ai-follow-ups`     | —                         | ⬜     |
| A3  | Assistant lecture org      | `assistant-org-read` | `assistant`         | A1 ou A2 (socle quota OK) | ⬜     |
| B1  | Devis assisté              | `ai-assisted-quote`  | `ai-assisted-quote` | A1 utile, 4.2 utile       | ⬜     |
| B2  | Brief du matin             | `ai-day-brief`       | `ai-day-brief`      | A2 et/ou A3               | ⬜     |
| B3  | Brouillons messages client | `ai-message-drafts`  | `ai-message-drafts` | A2 ; 5.2 pour SMS         | ⬜     |
| C1  | Inbox métier               | `ai-inbox-intake`    | `ai-inbox-intake`   | A3                        | ⬜     |
| C2  | Tournée expliquée          | `ai-tour-explain`    | `ai-tour-explain`   | 5.3                       | ⬜     |

**Ordre recommandé** : A1 → A2 → A3 → B1 → B2 → (B3 si SMS) → C2 avec la tournée → C1 en dernier (connecteurs).

Les priorités P0–P5 de `planwise.vision.md` (pièces fréquentes, contrats, reporting) **restent valides**. Ce programme IA est une **voie parallèle** : ne pas geler 4.2 / 5.1 pour A3.

---

## Modèle économique (figé pour OpenSpec)

**9,99 € ≠ IA illimitée.** Le guide produit reste dans Essentiel. Le copilote métier (tokens, surtout vision) se paie comme la suggestion d’équipe : **goûter → convertir**.

### Offres

| Offre               | Prix (cible)            | Accès copilote                                                       | Quotas LLM                                                        |
| ------------------- | ----------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Essai 15 j**      | 0 €                     | Features **débloquées** (levier conversion), comme `team_suggestion` | Palier **essai** : suffisant pour une vraie semaine, **plafonné** |
| **Essentiel**       | 9,99 € / org            | Guide illimité + A2 + **goût** A1 / A3 / B1                          | Palier **essentiel** (bas)                                        |
| **Addon Copilote**  | **7,99 € / mois / org** | Usage quotidien A1, A3, B1, B2, B3                                   | Palier **copilote**                                               |
| **Pro** (plus tard) | 29–39 € / org           | Addon **inclus** + C2 si 5.3                                         | Palier copilote (ou plus large)                                   |

Code addon prévu (pas encore au catalogue Stripe) : `ai_copilot`. Boolean, `requiresBaseSubscription: true`, à ajouter dans `ADDON_CODES` + `TRIAL_INCLUDED_ADDON_CODES` **dans le premier change qui gate une feature LLM** (A1). Même mécanique que `team_suggestion` : visible en essai, retiré à la fin si non acheté.

**C1 Inbox** : hors addon 7,99 € (connecteur + risque volume) — palier Pro ou addon dédié plus tard.  
**SMS / WhatsApp** : coût opérateur en plus, jamais « illimité dans le 7,99 € ».

### Quotas (par organisation, pas par user)

Compteur **mensuel** (reset calendaire) sauf mention. Assez haut en essai pour **enchaîner 4–8 chantiers** et sentir le gain ; assez bas pour ne pas se faire farmer 15 jours.

| Usage                    |                             Essai (15 j, total) | Essentiel payé / mois |   Copilote / Pro / mois |
| ------------------------ | ----------------------------------------------: | --------------------: | ----------------------: |
| A1 Compte-rendu          |                                              20 |                    15 |                     120 |
| A3 Questions lecture org |                                              25 |                    30 |                     200 |
| B1 Devis assistés        |                                               8 |                     5 |                      40 |
| B3 Brouillons message    |                                               8 |            0 (teaser) |                      40 |
| A2 À traiter             |                                          inclus |                inclus |    inclus + libellés IA |
| B2 Brief                 | inclus (déterministe ; LLM si quota A3 restant) |          déterministe |                 complet |
| C2 Tournée expliquée     |                                  si 5.3 + essai |                   non | si 5.3 + copilote / Pro |
| C1 Inbox                 |                                             non |                   non |   non (Pro / plus tard) |

Le guide in-app (`assistant` actuel) **ne consomme pas** ces quotas.

### Essai = levier de conversion (obligatoire)

Pendant `status === trialing` et `hasAccess` :

1. Les actions copilote **existantes** sont utilisables (pas de paywall dur).
2. Les quotas sont ceux de la colonne **Essai**, pas ceux de l’addon payant.
3. À l’approche / au plafond : message métier du type « Pendant l’essai, vous pouvez encore tester X fois. Après l’essai, l’option Copilote permet de continuer au quotidien. » — **pas** de jargon tokens / API.
4. Fin d’essai sans achat : retour palier Essentiel + teaser `AddonLockedOverlay` (comme la suggestion d’équipe).
5. Données de démo : les parcours IA doivent marcher sur le jeu d’essai (guide bienvenue peut citer « testez un compte-rendu » **une fois A1 livré**).

Interdit : essai = addon illimité ; essai = tout verrouillé derrière CB.

### Entitlement (à implémenter dès A1)

```text
si !hasAccess -> refuser

quota_tier =
  trialing                      -> essai
  addon ai_copilot ou plan Pro  -> copilote
  sinon                         -> essentiel

LLM copilote autorisé si quota_tier.restant > 0 pour cet usage
  (A1/A3/B1 ont un quota essentiel ; B3/C2 : 0 en essentiel = teaser)
```

A2 (listes déterministes) : pas de gate addon.  
Dépassement : 429 / message utilisateur, **aucune** file LLM silencieuse.

### UX paywall

- Quota restant discret (ex. « 4 comptes-rendus restants ce mois-ci »).
- Overlay verrouillé seulement si la feature n’est **pas** dans le palier Essentiel (B3, C2) ou quota épuisé.
- Landing / `/subscription` : ne vendre le copilote **qu’après** livraison A1.

---

## Socle technique (à poser au premier change A1 ou A2)

Réutiliser le module assistant gateway (clé LLM, flag, fallback). **Ne pas** créer un microservice dédié avant charge réelle.

Le premier change livré DOIT introduire, s’ils n’existent pas encore :

| Brique            | Exigence                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Client LLM unique | Appels côté serveur uniquement ; mocké en tests                                                     |
| Quota org         | Compteur **mensuel** par usage (A1/A3/B1…) ; palier essai / essentiel / copilote ; 429 si dépassé   |
| Entitlement       | Addon `ai_copilot` + `TRIAL_INCLUDED_ADDON_CODES` ; essai débloque, quotas essai ≠ quotas addon     |
| Audit             | Soft-trace : org, user, tranche, tokens approx., pas le prompt complet en clair en prod si évitable |
| Permissions       | Codes `ASSIGNABLE_PERMISSION_CODES` si nouvelle action ; `PermissionGate` UI                        |
| Isolation         | `organizationScopeFilter` / `OrganizationScopedHttpClient`                                          |

---

## Vague A

### A1 — Compte-rendu chantier

|                     |                                                                      |
| ------------------- | -------------------------------------------------------------------- |
| **Change OpenSpec** | `ai-field-report`                                                    |
| **Capability**      | `ai-field-report`                                                    |
| **Pourquoi**        | Remplace le soir WhatsApp / Excel. Démo essai la plus parlante.      |
| **Où**              | Intervention terminée (Ma journée + fiche)                           |
| **Monétisation**    | Essai 20 ; Essentiel 15/mois ; copilote 120/mois — voir § modèle éco |

**In scope** : dictée et/ou photos déjà attachées → proposition de résumé client, travaux, suite à donner ; l’utilisateur accepte / édite / ignore ; le texte accepté alimente commentaire ou rapport existant.

**Out of scope** : envoi automatique au client ; création de facture ; inventaire pièces inventé hors catalogue.

#### Exigences (coller dans le delta spec)

```text
### Requirement: Propose a field report from voice or photos

The system SHALL allow an authorized user to request an AI draft report
for a completed intervention in their organization. The draft MUST be
built only from that intervention’s notes, timestamps, and attached
photos (and an optional voice transcript). The system MUST show the
draft for edit and MUST NOT persist it as the official report until
the user confirms. If the model is unavailable, the system MUST keep
the raw inputs and tell the user to retry.

#### Scenario: User confirms edited draft
- **WHEN** a user with intervention write confirms a draft after editing
- **THEN** the system stores the confirmed text on the intervention and
  MUST NOT send it to the customer

#### Scenario: User discards draft
- **WHEN** the user dismisses the draft
- **THEN** the system MUST NOT change the intervention report fields

### Requirement: Trial can use a limited field-report quota

An organization on a valid trial MUST be able to request field-report
drafts without purchasing the copilote addon, up to the documented
trial cap. Exhausting the trial cap MUST show a user-facing limit
message and MUST NOT call the model. After the trial, the essentiel
monthly cap applies unless the copilote addon (or Pro) is active.

#### Scenario: Trial user confirms a draft
- **WHEN** a trialing org with remaining trial quota confirms a draft
- **THEN** the system stores the confirmed text and decrements the
  trial quota

#### Scenario: Trial quota exhausted
- **WHEN** a trialing org has used the trial field-report cap
- **THEN** the system MUST NOT call the model and MUST explain that
  the Copilote option continues this after the trial
```

**Tests** : unitaires mapping / refus cross-org ; E2E Ma journée → terminer → préremplir → confirmer (LLM mocké).

---

### A2 — Filet anti-oubli

|                     |                                                                   |
| ------------------- | ----------------------------------------------------------------- |
| **Change OpenSpec** | `ai-follow-ups`                                                   |
| **Capability**      | `ai-follow-ups`                                                   |
| **Pourquoi**        | Devis non relancés, contrats à programmer, dossiers à facturer.   |
| **Où**              | Liste « À traiter » (hub dashboard ou page dédiée whitelist)      |
| **Monétisation**    | Inclus Essentiel / essai (déterministe) ; libellés IA si copilote |

**In scope** : règles déterministes (âge, statuts) + libellé IA court optionnel ; lien vers la fiche ; pas d’envoi.

**Out of scope** : campagnes marketing ; write (créer dossier tout seul).

#### Exigences

```text
### Requirement: Surface overdue operational follow-ups

The system SHALL list organization-scoped follow-ups the user is
allowed to see, including at least: quotes waiting for a customer
response beyond a documented delay, maintenance contracts due to
schedule, and cases marked billable but not invoiced beyond a
documented delay. Each item MUST link to an existing authorized
route. Generating or refreshing the list MUST NOT send messages.

#### Scenario: Admin sees billable case
- **WHEN** a case in the user’s org has been billable longer than the
  documented delay and the user can read cases
- **THEN** the follow-up list includes that case with a link to it

#### Scenario: Other org hidden
- **WHEN** follow-ups exist only in another organization
- **THEN** the user MUST NOT see them
```

**Tests** : règles unitaires ; E2E ouverture liste + clic fiche (données mock).

---

### A3 — Assistant lecture organisation

|                     |                                                                           |
| ------------------- | ------------------------------------------------------------------------- |
| **Change OpenSpec** | `assistant-org-read`                                                      |
| **Capability**      | `assistant` (MODIFIED + ADDED)                                            |
| **Pourquoi**        | Passe du mode d’emploi au collègue qui connaît _leurs_ dossiers.          |
| **Où**              | Drawer assistant existant                                                 |
| **Monétisation**    | Essai 25 ; Essentiel 30/mois ; copilote 200/mois — le guide ne compte pas |

**In scope** : 3–4 tools lecture (ex. dossiers à facturer, historique d’un client nommé, interventions du jour, contrats à programmer). Réponses + liens whitelist. Cite uniquement des ids / libellés renvoyés par les tools.

**Out of scope** : tools write ; export massif ; « résume toute la base ».

#### Exigences

```text
### Requirement: Answer with organization-scoped read tools

The assistant MAY call documented read-only tools to answer questions
about the authenticated user’s organization. Tool results MUST be
filtered by organizationId and the user’s permissions. The assistant
MUST NOT invent customers, cases, or amounts absent from tool results.
Write tools MUST NOT exist in this change.

#### Scenario: Billable cases question
- **WHEN** the user asks which cases are waiting to be invoiced and
  has case read permission
- **THEN** the reply uses tool data from their org only and MAY
  suggest a catalog href they can open

#### Scenario: Missing permission
- **WHEN** the user lacks the permission required by a tool
- **THEN** the assistant MUST NOT return that tool’s data and MUST
  explain the limit or escalate to support
```

**Tests** : filtre tools / permissions ; pas de fuite cross-org ; E2E drawer + réponse mock tool.

---

## Vague B

### B1 — Devis assisté

|                     |                                                                   |
| ------------------- | ----------------------------------------------------------------- |
| **Change OpenSpec** | `ai-assisted-quote`                                               |
| **Capability**      | `ai-assisted-quote`                                               |
| **Dépendances**     | Catalogue prestations (et 4.2 pièces fréquentes si livré)         |
| **Monétisation**    | Essai 8 ; Essentiel 5/mois ; copilote 40/mois — voir § modèle éco |

**In scope** : texte libre ou compte-rendu A1 → lignes **proposées** depuis le catalogue org (prestation / article). Montants catalogue, pas inventés. Brouillon devis uniquement après confirmation.

**Out of scope** : envoi devis ; prix hors catalogue sans ligne manuelle explicite de l’utilisateur.

#### Exigences

```text
### Requirement: Propose quote lines from a description

The system SHALL propose draft quote lines mapped to the
organization catalog when a user describes work or confirms a field
report. Proposed unit prices MUST come from catalog (or user-entered
manual lines). The system MUST NOT create or send a quote until the
user confirms. Unknown work MUST be flagged rather than priced by
the model.

#### Scenario: Catalog match
- **WHEN** the description matches a catalog prestation and the user
  confirms
- **THEN** a draft quote includes that line at the catalog price

#### Scenario: No catalog match
- **WHEN** no catalog item matches
- **THEN** the system MUST NOT invent a price and MUST ask the user
  to pick or add a line
```

---

### B2 — Brief du matin

|                     |                                                      |
| ------------------- | ---------------------------------------------------- |
| **Change OpenSpec** | `ai-day-brief`                                       |
| **Capability**      | `ai-day-brief`                                       |
| **Dépendances**     | A2 et/ou A3 (réutiliser les mêmes signaux)           |
| **Monétisation**    | Essai + Essentiel déterministe ; complet si copilote |

**In scope** : carte « Aujourd’hui » sur Ma journée / dashboard : charge, conflit d’ordre, stock bas lié aux interventions du jour, 1–2 follow-ups A2. Texte court.

**Out of scope** : réordonnancement automatique du planning (ça c’est C2 / 5.3).

#### Exigences

```text
### Requirement: Show a morning operational brief

The system SHALL show an organization-scoped daily brief for the
current user combining today’s interventions they can see and any
A2 follow-ups that affect those jobs (or the org, for admins).
The brief MUST remain readable if the model is down (deterministic
fallback). The brief MUST NOT change assignments by itself.

#### Scenario: Technician opening Ma journée
- **WHEN** a linked technician opens Ma journée and has at least one
  intervention today
- **THEN** they see a brief that mentions that load without listing
  other technicians’ private notes they cannot read
```

---

### B3 — Brouillons de messages

|                     |                                               |
| ------------------- | --------------------------------------------- |
| **Change OpenSpec** | `ai-message-drafts`                           |
| **Capability**      | `ai-message-drafts`                           |
| **Dépendances**     | A2 ; SMS réel = vision 5.2                    |
| **Monétisation**    | Essai 8 ; Essentiel teaser ; copilote 40/mois |

**In scope** : brouillon e-mail (et SMS si 5.2) pour relance devis / « en route » / rappel contrat. Envoi = flux existant + confirmation.

**Out of scope** : séquences multi-jours type marketing automation.

#### Exigences

```text
### Requirement: Draft a customer message the user must send

The system SHALL draft a short French customer message from a
follow-up or intervention context. Sending MUST reuse the existing
confirm-and-send flows. Cancelling MUST NOT send. The draft MUST
not include other customers’ data.

#### Scenario: User cancels send
- **WHEN** the user closes the draft dialog
- **THEN** no e-mail or SMS is sent
```

---

## Vague C

### C1 — Inbox métier

|                     |                                                  |
| ------------------- | ------------------------------------------------ |
| **Change OpenSpec** | `ai-inbox-intake`                                |
| **Capability**      | `ai-inbox-intake`                                |
| **Dépendances**     | A3 ; consentement / CGU                          |
| **Monétisation**    | Hors addon 7,99 € — Pro ou addon dédié plus tard |

**In scope** : un canal (e-mail dédié ou WhatsApp Business) → brouillon client + intervention, **jamais** créé sans validation.

**Out of scope** : tous les canaux d’un coup ; réponse auto au client.

#### Exigences

```text
### Requirement: Propose intake from an inbound message

The system SHALL turn an inbound message addressed to the
organization into a proposed customer and/or intervention draft.
Staff MUST confirm before any record is created. Unparseable
messages MUST stay in a review queue.

#### Scenario: Staff confirms draft
- **WHEN** staff confirms a proposed intervention from an inbound
  message
- **THEN** the system creates it in their organization only
```

---

### C2 — Tournée expliquée

|                     |                                                                   |
| ------------------- | ----------------------------------------------------------------- |
| **Change OpenSpec** | `ai-tour-explain`                                                 |
| **Capability**      | `ai-tour-explain`                                                 |
| **Dépendances**     | Vision **5.3** (optimisation tournée) + addon suggestion d’équipe |
| **Monétisation**    | Essai si 5.3 ; Essentiel non ; copilote / Pro si 5.3              |

**In scope** : phrase humaine sur _pourquoi_ cet ordre (km, contrainte horaire). Un clic applique l’ordre **calculé** (pas un ordre inventé par le LLM).

**Out of scope** : remplacer l’algo de tournée par le LLM.

#### Exigences

```text
### Requirement: Explain a computed day tour

The system SHALL display a short explanation of a tour produced by
the existing routing engine. The model MUST NOT change stop order.
Applying the tour MUST use the engine’s order. If routing is not
entitled, the explanation MUST NOT appear as a paid bypass.

#### Scenario: User applies tour
- **WHEN** the user applies the suggested tour
- **THEN** intervention order matches the engine, not a model rewrite
```

---

## Hors programme (ne pas proposer)

- Agent write autonome (facture émise, client e-mailé, stock décrémenté sans tap)
- Fine-tuning / modèle maison
- Chat grand public non authentifié
- Portail client « pose une question à l’IA »
- Scoring / pipeline commercial
- SSO / API publique « AI » (la 5.4 reste hors IA)

---

## Après chaque livraison

Checklist Planwise habituelle, plus :

1. Statut `✅` dans le tableau ci-dessus.
2. `planwise.vision.md` Phase 6.
3. `docs/product/` + `ASSISTANT_ROUTE_CATALOG` + `PRODUCT_DOC_CHUNKS` + FAQ offline.
4. Archive OpenSpec (`/opsx-archive`) pour merger le delta dans `openspec/specs/<capability>/`.
5. Quota / copy landing / addon `ai_copilot` seulement si la feature est réellement offerte (A1 : catalogue + `TRIAL_INCLUDED_ADDON_CODES`).

---

## Fichiers liés

| Fichier                                                                      | Rôle                                  |
| ---------------------------------------------------------------------------- | ------------------------------------- |
| [`MVP.md`](./MVP.md)                                                         | Assistant guide (livré)               |
| [`openspec/specs/assistant/spec.md`](../../openspec/specs/assistant/spec.md) | Comportement actuel du drawer         |
| [`planwise.vision.md`](../../planwise.vision.md)                             | Phase 6 + cible TPE                   |
| [`openspec/config.yaml`](../../openspec/config.yaml)                         | Contexte injecté dans `/opsx-propose` |
