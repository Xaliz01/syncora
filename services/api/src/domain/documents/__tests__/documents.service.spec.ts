import { Types } from "mongoose";
import { DocumentsService } from "../documents.service";
import type { DocumentRecord } from "../../../persistence/documents/document.schema";

describe("DocumentsService lookups", () => {
  const organizationId = "org-1";
  const documentId = new Types.ObjectId().toHexString();

  function record(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
    return {
      _id: new Types.ObjectId(documentId),
      organizationId,
      entityType: "case",
      entityId: "case-1",
      originalName: "rapport.pdf",
      mimeType: "application/pdf",
      size: 8,
      storageKey: `${organizationId}/case/case-1/rapport.pdf`,
      uploadedBy: "user-1",
      get: (key: string) =>
        key === "createdAt" ? new Date("2026-03-01T00:00:00.000Z") : undefined,
      ...overrides,
    } as unknown as DocumentRecord;
  }

  function serviceWith(found: DocumentRecord | null) {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(found),
    });
    const model = { findOne };
    const storage = { getDownloadUrl: jest.fn(), upload: jest.fn(), delete: jest.fn() };
    const service = new DocumentsService(model as never, storage as never);
    return { service, findOne };
  }

  it("does not query an id that is not an ObjectId", async () => {
    const { service, findOne } = serviceWith(null);

    await expect(service.findActiveById(organizationId, "doc-1")).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  it("loads an active document only inside the caller organization", async () => {
    const doc = record();
    const { service, findOne } = serviceWith(doc);

    const result = await service.findActiveById(organizationId, documentId);

    expect(findOne).toHaveBeenCalledWith({
      _id: documentId,
      organizationId,
      deletedAt: null,
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: documentId,
        organizationId,
        entityType: "case",
        entityId: "case-1",
      }),
    );
  });

  it("loads an active document by storage key inside the organization", async () => {
    const doc = record();
    const { service, findOne } = serviceWith(doc);

    const result = await service.findActiveByStorageKey(organizationId, doc.storageKey);

    expect(findOne).toHaveBeenCalledWith({
      organizationId,
      storageKey: doc.storageKey,
      deletedAt: null,
    });
    expect(result?.storageKey).toBe(doc.storageKey);
  });
});
