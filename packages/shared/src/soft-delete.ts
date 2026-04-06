/**
 * Merge into MongoDB queries to exclude soft-deleted documents.
 * `{ deletedAt: null }` matches documents where the field is absent or explicitly null.
 */
export const activeDocumentFilter = { deletedAt: null } as const;
