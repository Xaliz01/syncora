# Parcours — Mon compte, thème et application (PWA)

## Objectif

Gérer le compte personnel, le confort d’usage, et l’installation mobile.

## Mon compte (`/account`)

1. Menu **Général → Mon compte** (pas de permission métier spéciale).
2. Identité, mot de passe, **thème** clair / sombre, sidebar repliée / dépliée, **commandes vocales** (Ma journée, mobile).
3. **Sessions** actives (déconnexion à distance si proposé).
4. Liens vers les pages légales.
5. Préférences synchronisées (serveur + local pour thème / sidebar). Le thème est aussi accessible via le toggle de l’en-tête.

## Application installable (PWA)

- Planwise est installable (manifest « standalone », démarrage souvent via `/login`).
- Service Worker : notifications push + page hors connexion `/~offline` (« Hors connexion » + Réessayer).
- Ce n’est **pas** une app native App Store / Play Store.
- Mode hors-réseau : ne pas promettre une édition métier complète offline ; l’objectif est la continuité (réessayer, caches limités).
- **Assistant « offline »** (sans clé LLM) = réponses catalogue sans IA — distinct du mode hors-réseau navigateur.

## Liens utiles

- Mon compte : `/account`
- Notifications (push) : `/settings/notifications`
