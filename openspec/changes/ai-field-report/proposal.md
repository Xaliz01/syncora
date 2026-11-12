# Compte-rendu chantier et dictaphone copilote

## Why

Un artisan doit pouvoir, depuis n'importe quel écran, dicter ce qui vient de se passer et obtenir des actions CRM proposées — en commençant par le compte-rendu d'intervention — sans que le modèle n'écrive rien tout seul.

## What changes

- Bouton **Dicter une instruction** sur toutes les pages authentifiées.
- Interprétation en actions structurées : compte-rendu, client, devis brouillon, note, rendez-vous, ou explication si l'instruction n'est pas applicable.
- Confirmation obligatoire avant toute écriture. Ignorer n'écrit rien. Aucun envoi au client.
- Historique durable `/copilote` (transcription, décision, fiches liées, audio si l'enregistrement reste raisonnable).
- Addon `ai_copilot` (7,99 €, identifiant Stripe prévu, pas un prix live), quotas essai / Essentiel / Copilote, permissions `ai.copilot` et `ai.field_report`.

## Non-goals

- Photos envoyées au modèle.
- Prix inventés par le modèle.
- Envoi de devis, d'e-mail ou émission de facture.
- Filet anti-oubli, lecture d'organisation, brief du matin (autres tranches).
