## Purpose

Permettre d’enregistrer les prestations consommées sur une intervention (quantité commerciale, hors stock) et de les choisir dans un sélecteur filtrable aux côtés des articles.

## ADDED Requirements

### Requirement: Record prestation consumption on an intervention

The system SHALL allow an authorized user who can manage intervention stock usage to add, update, and remove **prestation** consumption lines on an intervention belonging to their organization. Each line MUST reference an active organization prestation and a positive quantity (or zero to clear). Persisting a prestation usage MUST NOT create a stock movement and MUST NOT require a stock location. Reading intervention usage MUST return article usages and prestation usages for that intervention. Soft-deleted or inactive prestations MUST NOT be offered as new choices; existing lines MAY remain readable for history.

#### Scenario: Add a prestation usage

- **WHEN** a user with intervention create permission saves a new prestation line with quantity greater than zero on an intervention
- **THEN** the system persists the usage scoped to the organization and intervention and subsequent reads include that line with catalog name, reference, unit, and quantity

#### Scenario: No stock side effect

- **WHEN** a user saves or updates a prestation usage
- **THEN** the system MUST NOT create or modify stock movements or stock levels

#### Scenario: Reject foreign or unknown prestation

- **WHEN** the client sends a prestation id that does not belong to the organization (or does not exist)
- **THEN** the system MUST reject the request and MUST NOT persist the usage

### Requirement: Mixed searchable catalog picker on intervention usage

When an authorized user edits intervention usages, the system SHALL present a searchable picker that can select **articles and prestations** of the organization (name and reference), not an articles-only native select. Items already present on another draft line of the same dialog MUST NOT appear as selectable duplicates. After choosing an article, the user MUST still set quantity and optional stock location as today. After choosing a prestation, the user MUST set quantity only (no stock location).

#### Scenario: Filter mixed catalog

- **WHEN** the user opens the intervention usage dialog and types part of a name or reference
- **THEN** the picker lists matching articles and prestations not already chosen on another line

#### Scenario: Prestation line has no location

- **WHEN** the user selects a prestation
- **THEN** the line shows a quantity field and does not require or show a stock location control
