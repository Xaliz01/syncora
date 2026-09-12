# Parcours — Organisation et multi-organisations

## Objectif

Gérer la fiche entreprise et basculer / créer une organisation.

## Mon organisation (`/organization`)

1. Menu **Général → Mon organisation**.
2. Nom, e-mail, téléphone, adresse, logo (fiche en lecture).
3. **Modifier** ouvre `/organization/edit` (droit `organizations.update`, souvent admin) : formulaire pleine page, puis retour à la fiche. Le logo se change sur la fiche.

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
- Modifier l’organisation : `/organization/edit`
- Mon abonnement : `/subscription`
- Mon compte : `/account`
