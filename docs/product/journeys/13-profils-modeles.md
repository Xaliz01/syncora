# Parcours — Profils de permissions et modèles de dossier

## Objectif

Donner les bons droits aux membres, et accélérer la création de dossiers avec des modèles (y compris imports « métiers »).

## Profils (`/settings/profiles`)

1. Menu **Paramètres → Profils** (`profiles.read` ; édition selon droits profils).
2. Un **profil** = ensemble de permissions pour les membres **non admin**.
3. À l’invitation (`/users/new`) : choisir un profil pour le nouvel utilisateur.
4. Import possible depuis une **librairie** de profils prêts (« Importer depuis la librairie »).
5. L’**admin** d’organisation a tous les droits ; les membres = profil + éventuels ajouts / retraits.

## Modèles de dossier (`/settings/case-templates`)

1. Menu **Paramètres → Modèles de dossier** (`case_templates.read`).
2. Un modèle définit étapes / tâches / widgets dashboard réutilisés à la création d’un dossier.
3. Import de **modèles métiers** (ex. plomberie, électricité) via la librairie d’import.
4. À la création d’un dossier (`/cases/new`), choisir le modèle pour préremplir la structure.

## Types d’intervention (`/settings/intervention-types`)

1. Menu **Paramètres → Types d’intervention** (`intervention_types.read`).
2. Catalogue org (nom, description, couleur) ; import **Pose** / **SAV** depuis la librairie.
3. À la création d’une intervention sur un dossier : type **optionnel** ; une fois créé, le type n’est **plus modifiable** (snapshot nom/couleur).
4. Reporting **Liste des interventions** : filtre type (défaut « Tous »).

## Notes

- Route `/settings/permissions` : catalogue lié aux profils ; **pas** d’entrée menu principale — préférer **Profils**.
- « Je ne vois pas un menu » → permission manquante sur le profil, ou abonnement inactif (menu réduit).

## Liens utiles

- Profils : `/settings/profiles`
- Modèles de dossier : `/settings/case-templates`
- Types d’intervention : `/settings/intervention-types`
- Inviter un utilisateur : `/users/new`
- Nouveau dossier : `/cases/new`
