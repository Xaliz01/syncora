# Glossaire Planwise

| Terme                           | Définition                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| **Organisation**                | Locataire (entreprise) : isolation des données (`organizationId`).                    |
| **SIRET / SIREN**               | Identifiants entreprise FR ; recherche à l’inscription / création d’org.              |
| **Dossier**                     | Affaire / chantier suivi (étapes, tâches, interventions, documents).                  |
| **Modèle de dossier**           | Template d’étapes/tâches (import métiers possible) à la création.                     |
| **Intervention**                | Créneau terrain planifié ou réalisé (photos, signature, rapport PDF).                 |
| **Technicien**                  | Ressource terrain assignable ; peut être liée à un utilisateur.                       |
| **Équipe**                      | Groupe de techniciens ; assignable sur une intervention (à la place d’un technicien). |
| **Agence**                      | Base / site de l’organisation (flotte).                                               |
| **Véhicule**                    | Engin de flotte (immat, km, statut) ; peut porter un emplacement de stock.            |
| **Ma journée**                  | Liste du jour des interventions du technicien connecté.                               |
| **Planning**                    | Calendrier des interventions (jour / semaine / mois).                                 |
| **Client**                      | Bénéficiaire du chantier (particulier ou entreprise).                                 |
| **Donneur d'ordre**             | Tiers facturé quand ce n’est pas le client chantier.                                  |
| **Contrat de maintenance**      | Engagement récurrent ; modes « avec le client » ou « auto-plan ».                     |
| **Auto-planifier**              | Mode contrat : à l’échéance, crée dossier + intervention.                             |
| **À programmer avec le client** | Mode contrat : rappel ; créneau saisi manuellement (pending).                         |
| **Article**                     | Pièce / consommable du catalogue stock.                                               |
| **Emplacement de stock**        | Lieu de stockage (souvent véhicule / agence).                                         |
| **Mouvement de stock**          | Entrée, sortie, ajustement, transfert.                                                |
| **Prestation**                  | Ligne catalogue pour devis / facturation (≠ stock physique).                          |
| **Facturation**                 | Suivi + sync vers outil compta connecté — Planwise ne facture pas seul.               |
| **Intégration**                 | Connexion OAuth / API (une facturation active à la fois).                             |
| **Profil de permissions**       | Ensemble de droits assignables aux membres non admin.                                 |
| **Favoris**                     | Barre de raccourcis sous le header (★ ou drag menu), par org.                         |
| **Historique de navigation**    | Pages récentes (horloge près des favoris), local, par user+org.                       |
| **Essai / données de démo**     | Essai ~15 j ; jeu de données injectables / purgables.                                 |
| **Guide de démarrage**          | Modal post-onboarding (fondateur) : premiers pas + démo.                              |
| **Abonnement Essentiel**        | Offre socle Planwise (accès produit Stripe) — ≠ facturation clients.                  |
| **Quota de stockage documents** | Limite d’**espace** (10 Go inclus, +50 Go / addon) — pas un nombre max de fichiers.   |
| **Addon**                       | Option payante (suggestion d’équipe, users, stockage).                                |
| **Suggestion d'équipe**         | Addon : aide à choisir l’équipe proche (km, trajet, CO₂) ; inclus en essai.           |
| **Reporting**                   | Hub de rapports + exports Excel/CSV/PDF.                                              |
| **PWA / hors-ligne**            | App installable ; page `~offline` ; push via Service Worker.                          |
| **Assistant IA**                | Guide produit in-app (whitelist routes) ; inclus dans le socle.                       |
