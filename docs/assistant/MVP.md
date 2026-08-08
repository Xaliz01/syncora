# Assistant Planwise — MVP (cadrage)

> Guide in-app **conseiller** (explique + propose des liens), pas d’agent qui écrit en base.  
> Crisp reste le canal humain.  
> Dernière mise à jour : août 2026.

## Objectif MVP

Un utilisateur authentifié peut ouvrir un panneau « Assistant », poser une question métier (« comment créer un devis ? », « où est le planning ? ») et recevoir :

1. Une réponse courte en français
2. Des **liens internes** uniquement vers des routes autorisées pour ses permissions
3. Une sortie de secours vers le chat support (Crisp) si hors périmètre

**Hors scope MVP** : création d’entités, lecture de données org (clients/dossiers), tools write, fine-tuning.

---

## Architecture cible (MVP)

```text
Frontend drawer  →  POST /assistant/chat (gateway)  →  retrieve docs/product  →  LLM
                         ↑
              AuthUser + pathname + permissions
```

- **Pas de microservice dédié au départ** : module Nest dans l’api-gateway (un service `assistant-service` si le module grossit).
- **Connaissance** : Markdown versionné sous `docs/product/` (source de vérité produit).
- **Retrieval** : V1 = recherche lexicale / chunks pré-indexés en mémoire ; V1.1 = embeddings + store (plus tard).

---

## Tickets (ordre recommandé)

### T1 — Base de connaissance produit

**But** : contenu que l’assistant peut citer sans halluciner.

| Livrable         | Chemin                                               |
| ---------------- | ---------------------------------------------------- |
| Index            | [`docs/product/README.md`](../product/README.md)     |
| Catalogue routes | [`docs/product/routes.md`](../product/routes.md)     |
| Glossaire        | [`docs/product/glossary.md`](../product/glossary.md) |
| Parcours         | `docs/product/journeys/*.md`                         |

**Acceptation**

- [x] Chaque page menu AppShell a une entrée dans `routes.md` (label, href, permission)
- [x] Au moins 6 parcours couverts : client, dossier, intervention/ma journée, planning, devis/facture, intégration
- [x] Règle documentée : l’assistant ne propose **que** des href listés + filtrés par permission

**Effort** : S–M (rédaction)

---

### T2 — Contrat API partagé

**But** : types front/back stables.

| Livrable | Chemin                                                                                 |
| -------- | -------------------------------------------------------------------------------------- |
| Types    | `packages/shared/src/assistant.ts`                                                     |
| Export   | `packages/shared/src/index.ts`                                                         |
| Tests    | `packages/shared/src/__tests__/assistant.spec.ts` (validation payload / sanitize href) |

**Contrat proposé**

```ts
// Request
{
  message: string;           // max ~2000
  pathname?: string;         // page courante
  conversationId?: string;   // optionnel, session soft
}

// Response
{
  conversationId: string;
  reply: string;
  suggestions: Array<{ label: string; href: string }>; // href relative autorisée
  escalateToSupport?: boolean;
}
```

**Acceptation**

- [x] `message` validé (non vide, longueur max)
- [x] `suggestions[].href` normalisés (même esprit que `normalizeQuickActionHref`) + whitelist
- [x] Aucun secret / org data dans le contrat

**Effort** : S

---

### T3 — Backend gateway : chat + retrieval + LLM

**But** : endpoint authentifié qui répond.

| Livrable       | Chemin (indicatif)                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Port + service | `services/api-gateway/src/domain/assistant.service.ts`                                                   |
| Controller     | `services/api-gateway/src/presentation/http/assistant.controller.ts`                                     |
| Module         | `services/api-gateway/src/modules/assistant.module.ts`                                                   |
| Loader docs    | `services/api-gateway/src/infrastructure/assistant/product-docs.loader.ts`                               |
| Prompt         | `services/api-gateway/src/infrastructure/assistant/assistant.prompt.ts`                                  |
| Tests          | `**/assistant*.spec.ts`                                                                                  |
| Env            | `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY` (+ modèle), doc dans `planwise.tech.config.yml` / `.env.example` |

**Comportement**

1. Auth JWT obligatoire (`AuthUser`)
2. Contexte système : rôle, permissions, `pathname`, extrait docs pertinents
3. Appel LLM côté serveur uniquement
4. Post-filtre des `suggestions` : drop si pas dans whitelist **ou** permission manquante
5. Si LLM down / clé absente : 503 ou réponse fallback « utilisez le chat support »

**Acceptation**

- [x] Tests unitaires : filtre suggestions sans permission
- [x] Tests : message vide → 400
- [x] Pas d’appel LLM dans les unit tests (mock HTTP provider)
- [x] Logs sans contenu sensible (pas de dump JWT)

**Effort** : M

---

### T4 — UI drawer assistant

**But** : surface utilisateur dans l’app authentifiée.

| Livrable      | Chemin (indicatif)                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Bouton header | près de `CrispHelpButton` dans [`AppShell.tsx`](../../apps/frontend/components/layout/AppShell.tsx) |
| Drawer chat   | `apps/frontend/components/assistant/AssistantDrawer.tsx`                                            |
| API client    | `apps/frontend/lib/assistant.api.ts`                                                                |
| E2E           | `apps/frontend/tests/e2e/assistant.spec.ts` (mock API, parcours « ouvrir → question → lien »)       |

**UX**

- Bouton « Assistant » (icône distincte de Crisp)
- Drawer droite : historique local session, input, bulles, chips liens cliquables (`Link` Next)
- Envoyer `pathname` courant à chaque message
- Lien « Parler à un humain » → `openCrispChat()` si disponible

**Acceptation**

- [x] Visible seulement si authentifié + abonnement OK (même logique shell)
- [x] Clic suggestion → navigation
- [x] E2E mock : pas d’appel LLM réel en CI

**Effort** : M

---

### T5 — Mentions légales / cookies (si besoin)

**But** : transparence si traitement LLM tiers.

| Livrable                     | Chemin                                                      |
| ---------------------------- | ----------------------------------------------------------- |
| Confidentialité              | `apps/frontend/content/legal/politique-confidentialite.tsx` |
| Cookies (si storage session) | `politique-cookies.tsx` évent.                              |

**Acceptation**

- [x] Mention : messages envoyés à un prestataire LLM pour assistance produit ; pas d’entraînement public si le contrat le permet ; conservation éventuelle
- [x] Date légale mise à jour

**Effort** : S

---

### T6 (plus tard) — Durcissement

Hors MVP strict, backlog suivant :

- Embeddings + index persistant
- Feedback 👍/👎 + logs qualité
- Microservice `assistant-service` si charge / isolation
- Tools bornés (`explain_permission`) sans write
- Quota / rate-limit par org

---

## Découpage par fichier (checklist démarrage)

```text
docs/product/README.md
docs/product/routes.md
docs/product/glossary.md
docs/product/journeys/*.md
docs/assistant/MVP.md          ← ce fichier

packages/shared/src/assistant.ts          # T2 ✓
services/api-gateway/.../assistant.*      # T3 ✓
apps/frontend/components/assistant/*      # T4 ✓
apps/frontend/lib/assistant.api.ts        # T4 ✓
apps/frontend/tests/e2e/assistant.spec.ts # T4 ✓
```

---

## Définition de done MVP

- [x] T1 + T2 + T3 + T4 livrés
- [x] T5 si LLM tiers en prod
- [x] Aucune suggestion hors whitelist / hors permissions
- [x] Escalade Crisp documentée dans l’UI
- [x] Feature flag env (`ASSISTANT_ENABLED=true`) pour désactiver sans redeploy code

---

## Risques & mitigations

| Risque                  | Mitigation                                     |
| ----------------------- | ---------------------------------------------- |
| Hallucinations de menus | Whitelist routes + filtre permissions          |
| Coût LLM                | Rate-limit, max tokens, flag off               |
| Fuite de données        | Pas de données métier dans le prompt MVP       |
| Doublon Crisp           | Rôles clairs : guide produit vs support humain |
