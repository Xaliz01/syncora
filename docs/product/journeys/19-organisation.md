# Parcours — Organisation et multi-organisations

## Objectif

Gérer la fiche entreprise et basculer / créer une organisation.

## Mon organisation (`/organization`)

1. Menu **Général → Mon organisation**.
2. Nom, e-mail, téléphone, adresse, logo.
3. Édition selon `organizations.update` (souvent admin).

## Multi-org

- **Sélecteur d’organisation** dans la barre latérale : changer d’org active.
- Création possible via recherche **SIRET / SIREN / nom** (API entreprise).
- Le SIRET est aussi demandé à l’inscription / onboarding marketing.
- Isolation stricte des données par `organizationId` : changer d’org « vide » les listes de l’autre org (comportement attendu).

## Notes pour l’assistant

- L’assistant **ne lit pas** les données métier de l’organisation.
- Ne pas inventer d’écran « créer une org » hors du switcher / parcours inscription.

## Liens utiles

- Mon organisation : `/organization`
- Mon abonnement : `/subscription`
- Mon compte : `/account`
