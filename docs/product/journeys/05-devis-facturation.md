# Parcours — Devis & facturation

## Objectif

Établir un devis sur un dossier, puis créer / suivre la facture **via un outil de facturation connecté** (Pennylane, Qonto) ou le **mode démo** pendant l’essai.

**Important :** Planwise **ne facture pas tout seul**. Les devis sont gérés dans Planwise ; l’émission / sync des factures passe par l’intégration active.

## Prérequis

- Accès au dossier (`cases.read` / édition selon action)
- Pour le suivi factures : `exports.billing`
- Une intégration de facturation connectée (`/settings/integrations`) — sinon impossible de facturer pour de vrai

## Étapes

1. (Si besoin) Connecter un outil : **Paramètres → Intégrations** (`/settings/integrations`) — Pennylane, Qonto, ou facturation démo en essai.
2. Ouvrir le **dossier** concerné (`/cases` → fiche).
3. Section devis : créer / éditer les lignes (prestations, TVA) ; PDF devis si besoin.
4. Quand le travail est facturable : statut de facturation du dossier, puis créer / synchroniser la facture via l’outil connecté.
5. Suivi dans **Facturation** (`/billing`).

## Liens utiles

- Facturation : `/billing`
- Intégrations : `/settings/integrations`
- Prestations (catalogue) : `/settings/prestations`

## Erreurs fréquentes

- « Est-ce possible de facturer ? » → oui, **après** connexion d’un outil (ou mode démo essai) ; Planwise orchestre, l’outil facture.
- « Mon outil n’est pas dans la liste » → contacter le support (chat) pour une intégration.
- Une seule intégration de facturation active à la fois.
