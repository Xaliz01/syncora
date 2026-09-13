## ADDED Requirements

### Requirement: Invoice prefill includes intervention prestation usages

When an authorized user creates a customer invoice of kind `full` from one or more interventions of the same case, the prefill MUST include not only net article usages (qty > 0) but also **prestation usages** with quantity greater than zero for those interventions. Prefill lines for prestations MUST carry the catalog `prestationId`, label, unit, default unit price HT, and default TVA when available. The user MUST still be able to edit, add, or remove lines before submit. Creating the invoice MUST remain possible without an accepted quote when custom lines (including those from prestations) are provided, subject to existing billing-party rules.

#### Scenario: Prefill prestations from one intervention

- **WHEN** a user with invoice create permission chooses Facturer on an intervention that has prestation usages with quantity greater than zero
- **THEN** the invoice editor opens with custom lines that include those prestations (and any article usages) and submit creates a draft `full` invoice linked to the case

#### Scenario: Prefill aggregates articles and prestations across selection

- **WHEN** the user selects several interventions of the same case that together have article and prestation usages and creates an invoice
- **THEN** the editor prefills lines aggregated from both kinds of usages for the selected interventions
