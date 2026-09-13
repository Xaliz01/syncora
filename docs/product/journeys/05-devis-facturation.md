# Parcours — Devis & facturation

## Objectif

Établir un devis sur un dossier, puis émettre et suivre la facture **dans Planwise** (complète, situation, acompte, solde, avoir).

**Important :** les factures clients sont créées dans Planwise. L’émission via la facturation électronique arrivera prochainement.

## Prérequis

- Accès au dossier (`cases.read` / édition selon action)
- Pour envoyer un devis par e-mail : `quotes.send`
- Pour créer une facture : `billing.invoices.create`
- Pour le suivi : `billing.invoices.read` (ou `exports.billing`)
- Pour valider / avoir : `billing.invoices.finalize`
- Pour envoyer une facture par e-mail : `billing.invoices.send`

## Étapes

1. Ouvrir le **dossier** concerné (`/cases` → fiche).
2. Section devis : créer / éditer les lignes (prestations, TVA) ; PDF devis si besoin.
3. Envoyer le devis par e-mail (confirmation, PDF joint) ; l’historique des envois reste sur le devis. Un brouillon passe au statut Envoyé.
4. Quand le travail est facturable : **Créer une facture** depuis le devis, en saisie libre, ou **depuis une ou plusieurs interventions** du dossier (bouton **Facturer** sur une carte, ou cases à cocher + **Créer une facture** dans la section Interventions). Sur une intervention, vous enregistrez les **articles et prestations** consommés ; les lignes de facture sont préremplies avec ces consommations (qty > 0) ; vous pouvez les ajuster avant le brouillon.
5. Valider le brouillon pour numéroter la facture et télécharger le PDF.
6. Envoyer la facture par e-mail (confirmation, PDF joint) ; l’historique des envois reste visible sur le dossier et dans Facturation.
7. Suivi dans **Facturation** (`/billing`).

## Liens utiles

- Facturation : `/billing`
- Prestations (catalogue) : `/settings/prestations`

## Erreurs fréquentes

- « Est-ce possible de facturer ? » → oui, depuis le dossier (devis, saisie libre, ou interventions) ou l’écran Facturation.
- « Comment facturer une intervention ? » → fiche dossier → **Facturer** sur l’intervention, ou sélectionnez plusieurs interventions puis **Créer une facture**.
- « Comment ajouter une prestation sur une intervention ? » → fiche dossier → **Ajouter articles / prestations** (ou **Modifier**) sur l’intervention → choisir une prestation dans le sélecteur (sans emplacement stock).
- Un avoir se crée depuis une facture déjà validée ; le numéro d’origine n’est pas réutilisé.
