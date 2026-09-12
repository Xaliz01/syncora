# Parcours — Mon compte, thème et application (PWA)

## Objectif

Gérer le compte personnel, le confort d’usage, et l’installation mobile.

## Mon compte (`/account`)

1. Menu **Général → Mon compte** (pas de permission métier spéciale).
2. Fiche lecture : identité, mot de passe, **thème**, sidebar, **commandes vocales**, **sessions**, liens légaux.
3. **Modifier** → `/account/edit` : nom et préférences d’affichage (formulaire pleine page, Enregistrer en bas à droite).
4. Préférences synchronisées (serveur + local pour thème / sidebar). Le thème est aussi accessible via le toggle de l’en-tête.

## Mot de passe oublié

1. Depuis **Connexion**, lien **Mot de passe oublié ?** → `/forgot-password`.
2. Saisir l’e-mail du compte : message neutre (même si l’adresse est inconnue).
3. Lien reçu par e-mail → `/reset-password?token=…` (valable 1 heure, usage unique).
4. Nouveau mot de passe → connexion ; les sessions ouvertes sont déconnectées.

## Application installable (PWA)

- Planwise est installable (manifest « standalone », démarrage souvent via `/login`).
- Service Worker : notifications push + page hors connexion `/~offline` (« Hors connexion » + Réessayer).
- Ce n’est **pas** une app native App Store / Play Store.
- Mode hors-réseau : ne pas promettre une édition métier complète offline ; l’objectif est la continuité (réessayer, caches limités).
- **Assistant « offline »** (sans clé LLM) = réponses catalogue sans IA — distinct du mode hors-réseau navigateur.

## Liens utiles

- Mon compte : `/account`
- Modifier le compte : `/account/edit`
- Notifications (push) : `/settings/notifications`
