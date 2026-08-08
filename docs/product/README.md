# Connaissance produit Planwise (assistant)

Documentation **fonctionnelle** destinée à l’assistant in-app et à l’équipe.

## Règles pour l’assistant

1. Ne proposer que des routes listées dans [`routes.md`](./routes.md) (whitelist `ASSISTANT_ROUTE_CATALOG`).
2. Filtrer selon les **permissions** de l’utilisateur (colonne `permission`).
3. Si la question sort du produit (bug, facturation Stripe complexe, juridique détaillé) → escalader support (Crisp). Les questions « qui a développé / éditeur / contact » sont **dans le périmètre** (voir [`about.md`](./about.md)).
4. Réponses courtes, **vouvoiement** (MVP).
5. Ne jamais inventer un bouton ou un écran non documenté.
6. Distinguer **abonnement Planwise** et **facturation clients** (outil connecté).

## Sommaire

| Doc                          | Contenu                                  |
| ---------------------------- | ---------------------------------------- |
| [about.md](./about.md)       | Éditeur, contact, positionnement produit |
| [routes.md](./routes.md)     | Catalogue href + permissions             |
| [glossary.md](./glossary.md) | Termes métier Planwise                   |
| [journeys/](./journeys/)     | Parcours pas à pas                       |

### Parcours (`journeys/`)

| Fichier | Sujet                        |
| ------- | ---------------------------- |
| 01      | Créer un client              |
| 02      | Créer un dossier             |
| 03      | Ma journée / intervention    |
| 04      | Planning                     |
| 05      | Devis & facturation          |
| 06      | Intégrations                 |
| 07      | Inviter un utilisateur       |
| 08      | Assigner une intervention    |
| 09      | Favoris                      |
| 10      | Contrats de maintenance      |
| 11      | Onboarding & données de démo |
| 12      | Tableau de bord              |
| 13      | Profils & modèles de dossier |
| 14      | Notifications                |
| 15      | Abonnement, essai & addons   |
| 16      | Stock                        |
| 17      | Reporting                    |
| 18      | Recherche & historique       |
| 19      | Organisation                 |
| 20      | Compte & PWA                 |
| 21      | Flotte (véhicules / agences) |
| 22      | Donneurs d'ordre             |

## Maintenance

À chaque nouvelle page menu / permission / parcours utilisateur :

1. Mettre à jour `routes.md` / `glossary.md` / `journeys/*.md` **dans la même PR**.
2. Aligner `ASSISTANT_ROUTE_CATALOG` (`packages/shared/src/assistant.ts`) si nouveau lien proposable.
3. Aligner les chunks embarqués `PRODUCT_DOC_CHUNKS` dans
   `services/api-gateway/src/infrastructure/assistant/product-docs.loader.ts`
   (le runtime Docker n’embarque pas `docs/product/` — les chunks doivent rester riches et à jour).
4. Enrichir `offline-reply.ts` (FAQ) et le prompt (`assistant.prompt.ts`) pour les faits produits durs.
