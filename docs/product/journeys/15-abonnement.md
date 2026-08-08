# Parcours — Abonnement, essai et addons

## Objectif

Comprendre l’offre Planwise (accès produit) — **distinct** de la facturation clients (Pennylane / Qonto / démo).

## Offre Essentiel

- Page **Mon abonnement** : `/subscription`
- Plan **Essentiel** : **9,99 € / mois**, sans engagement
- **2 utilisateurs** inclus ; **10 Go** de stockage documents (ordre de grandeur marketing : ≈ 10 000 photos ou PDF)
- Essai typique **15 jours** sans CB ; pendant la beta, Planwise peut rester gratuit
- Prolongations d’essai self-service limitées (max **2**) tant que la facturation abonnement n’est pas ouverte ; au-delà → support Crisp

## Stockage des documents

- Il n’y a **pas de plafond sur le nombre** de fichiers / documents déposés.
- La limite est un **quota d’espace** partagé pour l’organisation : **10 Go** inclus dans Essentiel.
- L’usage (utilisé / quota) s’affiche sur **Mon abonnement** (`/subscription`) ; un bandeau d’alerte apparaît près du quota (≈ 80 %), et l’upload est **bloqué** si le quota est atteint.
- Pour augmenter : addon **Stockage supplémentaire** (+50 Go / unité, ~4,99 €/mois) depuis `/subscription`.
- Les documents se déposent sur les **fiches dossier** (et contextes liés) ; l’assistant ne lit pas votre consommation réelle.

## Addons (sur le socle)

- **Suggestion intelligente d’équipe** (~4,99 €/mois) : aide à choisir l’équipe / technicien proche (distance, trajet, carburant, CO₂). **Inclus pendant l’essai** pour découverte.
- **Utilisateur supplémentaire** (~2,99 €/mois / utilisateur)
- **Stockage supplémentaire** (~4,99 €/mois / +50 Go)

L’**assistant IA** et le **chat support** sont inclus dans le socle (pas un addon).

## Accès réduit

Sans accès actif (essai expiré, impayé…), le menu se limite à organisation / abonnement / compte. Ne pas proposer Dossiers, Planning, etc.

## Distinction importante

| Sujet                           | Où                                             |
| ------------------------------- | ---------------------------------------------- |
| Payer / gérer Planwise (Stripe) | `/subscription` (+ support si tunnel complexe) |
| Facturer un client chantier     | Intégration + `/billing` (voir parcours devis) |

Ne jamais confondre abonnement Stripe et facturation métier.

## Liens utiles

- Mon abonnement : `/subscription`
- Mon organisation : `/organization`
- Intégrations : `/settings/integrations`
