# Parcours — Stock (articles, emplacements, mouvements)

## Objectif

Suivre le stock physique (articles, emplacements, mouvements) et le distinguer des **prestations** (lignes devis / facture).

## Écrans

| Besoin              | Menu                               | Route                       | Permission typique     |
| ------------------- | ---------------------------------- | --------------------------- | ---------------------- |
| Mouvements          | Suivi → Mouvements de stock        | `/stock`                    | `stock.movements.read` |
| Catalogue articles  | Paramètres → Catalogue articles    | `/settings/stock/articles`  | `stock.articles.read`  |
| Emplacements        | Paramètres → Emplacements de stock | `/settings/stock/locations` | `stock.locations.read` |
| Prestations (devis) | Paramètres → Prestations           | `/settings/prestations`     | `prestations.read`     |

## Étapes courantes

1. Créer des **articles** dans le catalogue.
2. Définir des **emplacements** (souvent liés à un véhicule ou une agence).
3. Enregistrer des **mouvements** : entrées, sorties, ajustements, transferts (`/stock`).
4. Sur une **fiche dossier / intervention** : saisir les articles consommés (droits `stock.interventions.*`).

## Ne pas confondre

- **Article** = pièce / consommable en stock.
- **Prestation** = ligne catalogue pour **devis / facturation** (pas le stock physique).

## Liens utiles

- Mouvements : `/stock`
- Articles : `/settings/stock/articles`
- Emplacements : `/settings/stock/locations`
- Prestations : `/settings/prestations`
- Véhicules / agences (contexte flotte) : `/fleet/vehicles`, `/fleet/agences`
