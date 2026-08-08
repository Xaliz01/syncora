# Parcours — Tableau de bord

## Objectif

Voir d’un coup d’œil l’activité du jour / de la semaine et les actions à traiter.

## Prérequis

- Abonnement actif
- Pour les stats dossiers : `cases.read`
- Pour les visites maintenance : `cases.read` + `contracts.read`

## Contenu typique (`/`)

1. Salutation + résumé.
2. Carte **données de démo** pendant l’essai (admins) — voir parcours onboarding / démo.
3. Stats dossiers (si droit) : assignés, en cours, terminés cette semaine, en retard — un clic ouvre une **modale** de liste (pas une route catalogue dédiée).
4. Widgets **à faire** issus des règles dashboard des **modèles de dossier**.
5. Bloc **Visites à programmer** (contrats) → lien `/contracts?filter=to_schedule`.
6. Listes « mes dossiers actifs » / interventions du jour selon les droits.

## Sans `cases.read`

La page reste très légère (salutation, éventuellement carte démo). Les menus métier dépendent aussi des permissions.

## Liens utiles

- Tableau de bord : `/`
- Dossiers : `/cases`
- Contrats : `/contracts`
- Ma journée : `/my-day`
