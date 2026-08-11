# Parcours — Ma journée & intervention terrain

## Objectif

Voir les interventions du jour, démarrer / clôturer, photos, signature, rapport PDF.

## Prérequis

- Permission `interventions.read` (et droits d’action selon le profil)
- Compte souvent lié à un **technicien**

## Étapes

1. Menu **Suivi** → **Ma journée** (`/my-day`).
2. Ouvrir une intervention planifiée.
3. Démarrer (horodatage / géoloc si activée), ajouter photos, notes.
4. Faire signer le client, terminer l’intervention.
5. Générer / télécharger le **rapport PDF** si proposé.

## Commandes vocales (expérimental)

Sur **Ma journée** (jour en cours), si les **commandes vocales** sont activées dans **Mon compte → Préférences**, sur **mobile** (ou en local pour les tests), et que le navigateur expose la reconnaissance vocale :

- Si la préférence est désactivée : un bandeau invite à activer les commandes vocales (un clic, ou via Mon compte).
- Écoute **mains libres** dès l’ouverture de Ma journée : dites **« Planwise »** ou **« Plan »** puis la commande (ou « Planwise démarre » / « Plan démarre » d’un coup). Le bouton micro sert surtout à couper / reprendre, ou à autoriser le micro si le navigateur l’exige une première fois.
- Commandes : « démarre », « termine » (confirmation vocale : « oui » / « annuler »), « note que … », « prochaine », « ouvre le dossier ».
- Cible possible **dans la même phrase** : « termine la première », « démarre Intervention démo », « ajoute un commentaire à la deuxième porte fermée », « ouvre le dossier de la troisième ». Sinon : focus / dernière démarrée / seule cohérente ; sinon choix (sauf « termine » avec plusieurs en cours → toujours le choix).
- **Distinct** de l’assistant guide produit (panneau Aide) : ici on exécute des actions terrain, pas des explications.

## Liens utiles

- Ma journée : `/my-day`
- Planning (vue équipe) : `/cases/calendar`
- Dossier parent : via la fiche intervention / dossier

## Erreurs fréquentes

- Liste vide → pas d’intervention assignée aujourd’hui, mauvais technicien lié au compte, ou **aucun technicien lié** à l’utilisateur.
- Pas de Ma journée dans le menu → permission `interventions.read` absente.
- Pour lier un utilisateur à un technicien avant assignation : voir [08-assigner-intervention.md](./08-assigner-intervention.md).
- Micro absent / non supporté → Chrome / Safari récents ; flag désactivé par défaut.
