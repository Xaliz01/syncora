# Parcours — Devis & facturation

## Objectif

Établir un devis sur un dossier, puis émettre et suivre la facture **dans Planwise** (complète, situation, acompte, solde, avoir).

**Important :** les factures clients sont créées dans Planwise. L’émission via la facturation électronique arrivera prochainement.

## Prérequis

- Accès au dossier (`cases.read` / édition selon action)
- Pour créer une facture : `billing.invoices.create`
- Pour le suivi : `billing.invoices.read` (ou `exports.billing`)
- Pour valider / avoir : `billing.invoices.finalize`
- Pour envoyer par e-mail : `billing.invoices.send`

## Étapes

1. Ouvrir le **dossier** concerné (`/cases` → fiche).
2. Section devis : créer / éditer les lignes (prestations, TVA) ; PDF devis si besoin.
3. Quand le travail est facturable : statut de facturation du dossier, puis **Créer une facture** (depuis le devis ou en saisie libre).
4. Valider le brouillon pour numéroter la facture et télécharger le PDF.
5. Envoyer la facture par e-mail (confirmation, PDF joint) ; l’historique des envois reste visible sur le dossier et dans Facturation.
6. Suivi dans **Facturation** (`/billing`).

## Liens utiles

- Facturation : `/billing`
- Prestations (catalogue) : `/settings/prestations`

## Erreurs fréquentes

- « Est-ce possible de facturer ? » → oui, depuis le dossier ou l’écran Facturation.
- Un avoir se crée depuis une facture déjà validée ; le numéro d’origine n’est pas réutilisé.
