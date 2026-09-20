# assistant Specification

## Purpose

Guider un utilisateur authentifié dans Planwise (expliquer + liens internes autorisés), sans lire les données métier de l’organisation et sans écrire en base. Évolution prévue : [`docs/assistant/ROADMAP.md`](../../../docs/assistant/ROADMAP.md) (tranche A3 = lecture org).

## Requirements

### Requirement: Product-guide chat

The system SHALL provide an in-app assistant for authenticated users with an active subscription path. The assistant MUST answer how-to and where-to-click questions in French using product documentation. The assistant MUST NOT create or modify business records. The assistant MUST NOT read organization business data (customers, cases, quotes, invoices, stock) in the current capability.

#### Scenario: How-to question with allowed link

- **WHEN** an authenticated user asks how to create an intervention and has the required permission
- **THEN** the assistant replies with short steps and MAY suggest a catalog href the user is allowed to open

#### Scenario: Missing API key fallback

- **WHEN** the LLM provider is not configured
- **THEN** the system still returns a usable reply (offline / FAQ) or an escalation to human support and MUST NOT fail the whole app shell

### Requirement: Suggestion whitelist and permissions

Suggested hrefs MUST be drawn from `ASSISTANT_ROUTE_CATALOG` and MUST be dropped if the user lacks the linked permission. The assistant MUST NOT invent screens, buttons, or routes outside that catalog.

#### Scenario: Suggestion dropped without permission

- **WHEN** the model proposes a href the user cannot access
- **THEN** the API response MUST omit that suggestion

#### Scenario: Unknown href dropped

- **WHEN** the model proposes an href absent from the catalog
- **THEN** the API response MUST omit that suggestion

### Requirement: Support escalation

The assistant MUST be able to signal that a human (Crisp) should take over for bugs, complex billing of the Planwise subscription, or topics outside the product. Product navigation questions covered by docs MUST NOT force escalation.

#### Scenario: Out of product scope

- **WHEN** the user asks something outside Planwise product usage
- **THEN** the reply says so and escalation to support is indicated

### Requirement: Tenant and secret hygiene

Assistant requests MUST be authenticated. Logs and prompts MUST NOT include JWT secrets. Organization business records MUST NOT be injected into the prompt in this capability.

#### Scenario: Unauthenticated call

- **WHEN** a client calls the assistant chat endpoint without a valid session
- **THEN** the system rejects the request and MUST NOT call the LLM
