# Parcours — Onboarding et données de démo

## Objectif

Configurer le premier compte fondateur et, si besoin, charger un jeu de données de démonstration pendant l’essai.

## Prérequis

- Compte authentifié (souvent juste après inscription)
- Accès abonnement / essai actif pour utiliser l’app métier

## Onboarding (`/onboarding`)

1. Après login, le fondateur admin peut être redirigé vers `/onboarding` tant que le profil n’est pas terminé.
2. Étape profil : indiquer si **vous allez sur le terrain** (`goesOnInterventions`) — Planwise peut alors créer / lier un **technicien** à votre compte.
3. Étape suivante : **injecter les données de démo** ou **ignorer**.
4. Une fois terminé, retour à l’app (`/`). Rouvrir `/onboarding` alors que c’est déjà fait renvoie vers l’accueil.

## Guide de démarrage (modal)

Après l’onboarding, une modal **guide de démarrage** (fondateur admin) propose des actions : créer un client, un dossier, inviter un utilisateur, charger la démo, connecter la facturation. Elle est **skippable** ; une fois fermée (`setupGuideDismissed`), elle ne revient pas.

## Données de démo (essai)

- Période d’essai typique : **15 jours**, sans carte bancaire (beta : Planwise peut rester gratuit).
- Injection possible depuis : onboarding, guide de démarrage, ou carte **données de démo** sur le **tableau de bord** (admins org, statut essai).
- Contenu typique : clients et dossiers marqués « Démo », articles, techniciens, équipes, profils / modèles — une partie assignée à l’utilisateur connecté.
- Statuts d’injection : en cours (`injecting`) puis prêt (`ready`) ; purge manuelle possible ; purge automatique en fin d’essai (cron).
- Après essai, une carte peut rester pour **supprimer** d’éventuelles données restantes.

## Notes

- Ce n’est **pas** une entrée du menu latéral.
- L’assistant ne lit pas les données démo de l’organisation ; il guide seulement vers les écrans.

## Liens utiles

- Tableau de bord : `/`
- Intégrations (facturation démo) : `/settings/integrations`
- Abonnement : `/subscription`
