# Parcours — Notifications

## Objectif

Recevoir et paramétrer les alertes (in-app, e-mail, push) : assignations, rappels d’intervention, signatures, dossiers, rappels de visite maintenance, etc.

## Inbox (cloche)

- Icône **cloche** dans l’en-tête : notifications in-app (pas une page du catalogue de routes).
- Ouvrir une notif pour aller vers le contexte (dossier, intervention…).

## Préférences (`/settings/notifications`)

1. Menu **Paramètres → Notifications** (`notifications.manage_preferences`).
2. Choisir les **canaux** : in-app, e-mail, push.
3. Activer / désactiver par **type d’événement**.
4. Pour les rappels d’intervention : délai avant le créneau (ex. 15 min → 1 jour selon les options proposées).
5. **Push** : nécessite un Service Worker et l’autorisation du navigateur. Si l’utilisateur a refusé une fois, il faut **réactiver manuellement** dans les réglages du site (Chrome/Edge/Safari), puis revenir sur l’écran et activer les push.
6. Sur **iPhone / iPad (Safari)** : installer d’abord Planwise via Partager → « Sur l’écran d’accueil », puis autoriser les notifications iOS pour Planwise.

## Lien avec le terrain

Pas de notif d’assignation / rappel pour un collègue si son **technicien** n’est pas **lié** à son compte utilisateur (voir parcours assignation).

## Liens utiles

- Notifications (préférences) : `/settings/notifications`
- Techniciens : `/fleet/technicians`
- Ma journée : `/my-day`
