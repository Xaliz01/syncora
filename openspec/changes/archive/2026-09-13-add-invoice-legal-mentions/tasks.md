## 1. Contrats partagés

- [x] 1.1 Ajouter `DEFAULT_INVOICE_MENTIONS_FR` et `resolveInvoiceMentions` dans `@planwise/shared` (paymentTerms, latePenalties, recoveryIndemnity, discount, vatFranchise optionnel) et vérifier via un test unitaire que les clés vides retombent sur le défaut français
- [x] 1.2 Étendre `OrganizationResponse` / `UpdateOrganizationBody` (legalForm, shareCapital, rcsLabel, vatNumber, invoiceMentions) et `InvoiceSellerSnapshot` (mêmes champs d’identité + mentions résolues) puis vérifier `npm run build --workspace @planwise/shared`

## 2. Organisation

- [x] 2.1 Étendre le schéma Mongo organisation + migration migrate-mongo (champs optionnels, `down` cohérent) et vérifier que le service démarre avec la migration pending
- [x] 2.2 Exposer lecture / PATCH des champs d’identité et mentions (limite de longueur, isolation `organizationId`) et vérifier par tests unitaires du service organisations qu’un PATCH autorisé persiste et qu’un texte vide n’écrase pas le fallback à la lecture résolue
- [x] 2.3 Faire suivre le gateway (`UpdateOrganizationBody` / réponse) et vérifier le typecheck api-gateway

## 3. Factures et PDF

- [x] 3.1 Dans le gateway, remplir le snapshot vendeur (identité + `resolveInvoiceMentions`) à la création de facture (et preview PDF ; pas d’API d’édition de brouillon), et vérifier par test unitaire que le body envoyé à billing-service contient les mentions résolues
- [x] 3.2 Persister `seller.mentions` / identité enrichie dans billing-service et vérifier qu’une facture finalisée ne recalcule pas les mentions depuis l’org
- [x] 3.3 Rendre le bloc mentions + identité juridique dans `invoice-pdf.ts` (après totaux, avant pied « Généré par Planwise ») ; fallback défauts si snapshot absent (factures déjà émises) ; vérifier le test `invoice-pdf.spec.ts` (présence des textes défaut / custom)

## 4. Frontend organisation

- [x] 4.1 Section « Facturation et mentions légales » sur `/organization/edit` (FormPage existant, champs identité + textareas mentions, bouton restaurer les défauts, hint utilisateur métier) et vérifier le parcours dans le navigateur : saisie, enregistrement, restore
- [x] 4.2 Recap lecture seule sur `/organization` (mentions actuelles ou défauts) et vérifier que le membre sans `organizations.update` voit le recap mais pas l’édition
- [x] 4.3 Ajouter un test E2E Playwright du parcours (admin ouvre organisation, voit les mentions par défaut, enregistre une mention personnalisée, puis restaure les défauts sans perdre l’identité juridique) dans `apps/frontend/tests/e2e/`

## 5. Assistant et vérifs

- [x] 5.1 Mettre à jour `docs/product/` (glossary / organisation) et le chunk `product-docs.loader.ts` sur les mentions de facture → `/organization`, puis vérifier qu’un test retrieval / offline existant ne régresse pas
- [x] 5.2 Lancer `npm run format`, `npm run lint`, `npm run typecheck` et les tests unitaires touchés (shared, organizations, billing, gateway) et vérifier qu’ils passent
