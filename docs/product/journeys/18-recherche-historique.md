# Parcours — Recherche, favoris et historique de navigation

## Objectif

Retrouver rapidement une fiche ou une page déjà visitée.

## Recherche

1. Champ **recherche** dans l’en-tête (desktop ou mobile) → `/search?q=…`
2. Types recherchés (filtrés par droits) : dossiers, interventions, clients, donneurs d’ordre, véhicules, techniciens, équipes, agences, articles, prestations, utilisateurs.
3. Pas d’entrée sidebar dédiée ; route catalogue `/search`.

## Favoris

Barre sous le header : étoile ★ ou glisser depuis le menu — voir `09-favoris.md`. Ce n’est **pas** les favoris du navigateur.

## Historique de navigation

1. Bouton **horloge** à côté de la barre de favoris → tiroir **Historique de navigation**.
2. Liste des **pages récentes** (stockage local, par utilisateur + organisation, plafond ~50).
3. Ignoré : login, register, onboarding, pages platform, page hors-ligne `~offline`.
4. Ce n’est **pas** une entrée du menu latéral, ni la même chose que les favoris.

## Erreurs fréquentes

- Recherche vide → requête trop courte, permissions, ou org sans données (proposer la démo en essai).
- « Où est l’historique ? » → icône horloge près des favoris, pas un menu « Historique ».

## Liens utiles

- Recherche : `/search`
- Tableau de bord : `/`
