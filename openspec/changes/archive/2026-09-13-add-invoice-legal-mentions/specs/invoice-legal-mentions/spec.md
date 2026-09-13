## Purpose

Permet à une organisation de paramétrer l’identité juridique et les mentions réglementaires de ses factures, avec des textes par défaut conformes au droit français et la possibilité de les adapter.

## ADDED Requirements

### Requirement: Organization legal identity for invoicing

The system SHALL persist optional seller legal-identity fields on the organization: legal form, share capital, RCS city (and optional RCS number/label), and intra-community VAT number. Users with `organizations.update` MUST be able to edit these fields on the organization settings form. Existing organization identity (name, SIRET, address, email) MUST remain available and MUST still appear on invoices.

#### Scenario: Save legal identity

- **WHEN** an authorized user saves legal form, RCS city, VAT number and optional share capital on organization settings
- **THEN** the organization profile stores those values and they are returned on subsequent organization reads

#### Scenario: Unauthorized cannot update legal identity

- **WHEN** a user without `organizations.update` attempts to change legal identity or invoice mentions
- **THEN** the system MUST reject the request and MUST NOT persist the change

### Requirement: Default French invoice mentions

The system SHALL provide default French invoice mention texts covering at least: payment terms, late-payment penalties (Code de commerce L441-10), the 40 € recovery indemnity, and discount / no-discount wording. When an organization has never customized a mention, the system MUST use the corresponding default. A VAT franchise mention (CGI art. 293 B) MUST be available as a default text that the organization can enable or edit.

#### Scenario: New organization uses defaults

- **WHEN** an organization has not customized invoice mentions
- **THEN** newly created invoices MUST include the default French mention texts (payment terms, late penalties, 40 € indemnity, no-discount unless a discount text was saved)

#### Scenario: Restore default mention texts

- **WHEN** an authorized user chooses to restore default invoice mentions
- **THEN** the mention texts are reset to the product defaults and legal-identity fields (form, capital, RCS, VAT number) are left unchanged

### Requirement: Editable mention texts

The system SHALL allow an authorized user to edit the invoice mention texts (plain text, reasonable length limit) from organization settings. Empty customized text MUST fall back to the product default for that mention at the next invoice snapshot. The organization detail page MUST show the current mentions (or defaults) so the user can see what will appear on invoices.

#### Scenario: Custom mention appears on next invoice

- **WHEN** an authorized user saves a custom late-penalty mention and a new invoice is created afterwards
- **THEN** the invoice snapshot uses the custom text instead of the product default

#### Scenario: Cleared mention falls back to default

- **WHEN** an authorized user clears a customized mention and a new invoice is created afterwards
- **THEN** the invoice snapshot uses the product default for that mention
