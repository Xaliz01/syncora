# intervention-articles Specification

## Purpose

Permettre d’enregistrer les articles consommés sur une intervention en les choisissant dans un sélecteur filtrable (nom et référence), y compris lorsque le catalogue est long.

## Requirements

### Requirement: Searchable article picker on an intervention

When an authorized user adds or changes the articles used on an intervention, the system SHALL present a searchable picker of organization articles (name and reference), not an unfiltered native select. Articles already present on the same intervention draft MUST NOT appear as selectable duplicates. After a choice, the user MUST still be able to set quantity and stock location as today.

#### Scenario: Filter articles by name or reference

- **WHEN** the user opens the intervention articles dialog and types part of an article name or reference
- **THEN** the picker lists matching articles and the user can select one to add a line

#### Scenario: Empty search shows remaining articles

- **WHEN** the search field is empty
- **THEN** the picker lists articles not already chosen on another line of the same dialog

#### Scenario: No match

- **WHEN** the typed text matches no remaining article
- **THEN** the picker shows that there is no result and does not invent a line
