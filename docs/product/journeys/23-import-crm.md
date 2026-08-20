# Parcours — Import de données (historiques)

## Objectif

Permettre à une organisation de **charger d’anciennes données** (clients, catalogues, dossiers, interventions) depuis un autre outil, via des fichiers CSV préparés selon le modèle Planwise.

## Prérequis

- Droit `data_import.read` pour ouvrir l’écran ; `data_import.run` pour valider et importer (admins org : tous les droits).
- Utilisateurs / équipes déjà créés dans Planwise si vous voulez assigner des interventions à l’import (`assigneeEmail` / `teamName`).
- Fichiers **CSV UTF-8**, séparateur **`;`** (Excel France). Taille max **20 Mo**, **25 000 lignes** par fichier.

## Où

Paramètres → **Import de données** (`/settings/data-import`).

## Quand importer quoi

Pas besoin de tout importer d’un coup, ni dans un ordre fixe. Règle simple : **si une ligne parle d’une autre fiche, cette fiche doit déjà être dans Planwise**.

Exemples :

- Pour importer des **sites**, les **clients** correspondants doivent déjà être importés.
- Pour importer des **dossiers** liés à un client, un site ou un donneur d’ordre, importez ces fiches avant.
- Pour importer des **interventions**, les **dossiers** correspondants doivent déjà être importés.
- **Articles**, **prestations** et **donneurs d’ordre** : aucun autre fichier n’est requis avant.

Chaque fichier se valide puis s’importe séparément. Un `externalId` unique par type sert de clé ; un **ré-import** met à jour la même fiche (idempotent).

## Colonne `externalId`

Identifiant **dans votre ancien CRM** (ex. `CLI-001`). Planwise le stocke pour :

- relier dossiers → clients / sites / donneurs d’ordre ;
- relier interventions → dossiers ;
- éviter les doublons au ré-import.

## Étapes utilisateur

0. **(Optionnel)** Si votre export n’a pas les colonnes Planwise : section **Convertir mon export** — choisir l’entité, déposer le CSV source (séparateur `;` ou `,`), vérifier les correspondances proposées (IA si configurée, sinon heuristique), télécharger le CSV Planwise. Au-delà de **25 000 lignes**, le convertisseur découpe en plusieurs fichiers (`…-partie-1-sur-N.csv`, etc.) à importer un par un.
1. Télécharger les modèles CSV depuis l’écran Import de données (si vous partez d’un fichier vierge).
2. Remplir / ajuster avec vos données (voir colonnes ci-dessous et exemples dans les modèles).
3. Pour chaque entité : **Valider** le fichier → corriger les erreurs signalées → **Importer**.
4. Consulter le rapport (créés / mis à jour / ignorés) et le détail des erreurs.
5. **Annuler un import** (optionnel) : section **Historique des imports** → **Annuler cet import**. Suppression **définitive** des fiches **créées** par ce lot uniquement (les mises à jour restent). Pas de cascade vers d’autres entités.

## Fichiers et colonnes

### Clients — `clients.csv`

| Colonne                                                         | Requis                    | Notes                                                                    |
| --------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------ |
| `externalId`                                                    | oui                       | Clé unique                                                               |
| `kind`                                                          | oui                       | `individual` ou `company`                                                |
| `companyName`                                                   | si company                |                                                                          |
| `firstName` / `lastName`                                        | au moins un si individual |                                                                          |
| `legalIdentifier`, `email`, `phone`, `mobile`, adresse, `notes` | non                       | Adresse = `addressLine1` + `postalCode` + `city` (+ `country` défaut FR) |

### Sites — `sites_clients.csv`

| Colonne                                                                           | Requis               |
| --------------------------------------------------------------------------------- | -------------------- |
| `externalId`, `customerExternalId`, `label`, `addressLine1`, `postalCode`, `city` | oui                  |
| `isDefault`                                                                       | non (`true`/`false`) |

`customerExternalId` = `externalId` d’un client **déjà importé**.

### Donneurs d’ordre — `donneurs_ordre.csv`

Même forme que les clients.

### Articles / Prestations

- Articles : `externalId`, `name`, `reference` (+ stock/prix optionnels). Toujours créés **actifs** (pas de colonne `isActive`).
- Prestations : `externalId`, `name`, `reference`, `defaultPrice` (+ `defaultTvaRate` : 0, 5.5, 10 ou 20). Toujours créées **actives**.

La `reference` est normalisée en majuscules et unique dans l’org.

### Dossiers — `dossiers.csv`

| Colonne                | Notes                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `externalId`           | Requis — clé de liaison (ré-import, liens interventions)                             |
| `reference`            | Référence libre optionnelle                                                          |
| `status`               | `draft`, `open`, `in_progress`, `waiting`, `completed`, `cancelled` (défaut `draft`) |
| `priority`             | `low`, `medium`, `high`, `urgent`                                                    |
| `dueDate`              | ISO `YYYY-MM-DD`                                                                     |
| `customerExternalId`   | = `externalId` du client (fichier `clients.csv`), déjà importé                       |
| `orderGiverExternalId` | = `externalId` du donneur d’ordre (`donneurs_ordre.csv`), déjà importé               |
| `siteExternalId`       | = `externalId` du site (`sites_clients.csv`), déjà importé                           |
| `tags`                 | Séparés par `\|`                                                                     |

Pas de colonne `title` : le **numéro** Planwise (`YYYY-0001`) est attribué automatiquement, et le titre d’affichage est composé `n° - nom du client` (comme à la création manuelle).

### Interventions — `interventions.csv` (historique autorisé)

| Colonne                           | Notes                                                                 |
| --------------------------------- | --------------------------------------------------------------------- |
| `externalId`, `title`             | Requis                                                                |
| `caseExternalId`                  | = `externalId` du dossier (`dossiers.csv`), déjà importé — **requis** |
| `status`                          | `planned`, `in_progress`, `completed`, `cancelled`                    |
| `startedAt`                       | Requis si `in_progress`                                               |
| `completedAt`                     | Requis si `completed`                                                 |
| `scheduledStart` / `scheduledEnd` | ISO date-heure                                                        |
| `typeName` / `typeColor`          | Crée le type s’il n’existe pas ; snapshot figé                        |
| `assigneeEmail` **ou** `teamName` | Exclusifs ; introuvable → warning, ligne créée sans assignation       |

## Limites (hors V1)

Pas d’import de photos, signatures, factures, mouvements de stock liés aux interventions, ni connecteurs CRM natifs.

## Liens utiles

- Écran : `/settings/data-import`
- Modèles : `/import-templates/*.csv`
