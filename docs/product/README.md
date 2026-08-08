# Connaissance produit Planwise (assistant)

Documentation **fonctionnelle** destinée à l’assistant in-app et à l’équipe.

## Règles pour l’assistant

1. Ne proposer que des routes listées dans [`routes.md`](./routes.md).
2. Filtrer selon les **permissions** de l’utilisateur (colonne `permission`).
3. Si la question sort du produit (bug, facturation Stripe complexe, juridique détaillé) → escalader support (Crisp). Les questions « qui a développé / éditeur / contact » sont **dans le périmètre** (voir [`about.md`](./about.md)).
4. Réponses courtes, tutoiement ou vouvoiement cohérent avec l’UI (vouvoiement landing ; tutoiement terrain possible — **préférence MVP : vouvoiement**).
5. Ne jamais inventer un bouton ou un écran non documenté.

## Sommaire

| Doc                          | Contenu                                  |
| ---------------------------- | ---------------------------------------- |
| [about.md](./about.md)       | Éditeur, contact, positionnement produit |
| [routes.md](./routes.md)     | Catalogue href + permissions             |
| [glossary.md](./glossary.md) | Termes métier Planwise                   |
| [journeys/](./journeys/)     | Parcours pas à pas                       |

## Maintenance

À chaque nouvelle page menu / permission : mettre à jour `routes.md` **dans la même PR**.
