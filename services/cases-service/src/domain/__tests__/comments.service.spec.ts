import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { activeDocumentFilter } from "@planwise/shared";
import { CasesService } from "../cases.service";
import { AbstractCasesService } from "../ports/cases.service.port";

const updateChain = (result: Record<string, unknown> = { matchedCount: 1, modifiedCount: 1 }) => {
  const p = Promise.resolve(result);
  return {
    exec: jest.fn().mockImplementation(() => p),
    then: (fn?: (v: unknown) => unknown) => p.then(fn),
  };
};

describe("CasesService comments", () => {
  let service: CasesService;
  let mockCaseModel: { findOne: jest.Mock };
  let mockInterventionModel: { findOne: jest.Mock };
  let mockCommentModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    updateOne: jest.Mock;
  };

  const mockCommentDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "comment-1" },
    organizationId: "org-1",
    entityType: "case",
    entityId: "case-1",
    caseId: "case-1",
    body: "Hello",
    authorId: "user-1",
    authorName: "Alice",
    get: jest.fn((key: string) =>
      key === "createdAt"
        ? new Date("2026-01-01T10:00:00.000Z")
        : key === "updatedAt"
          ? new Date("2026-01-01T10:00:00.000Z")
          : undefined,
    ),
    ...overrides,
  });

  beforeEach(async () => {
    mockCaseModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: { toString: () => "case-1" } }),
        }),
      }),
    };
    mockInterventionModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ caseId: "case-1" }),
        }),
      }),
    };
    mockCommentModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        }),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      updateOne: jest.fn().mockImplementation(() => updateChain()),
    };

    const noopModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          exec: jest.fn().mockResolvedValue([]),
        }),
        select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        exec: jest.fn().mockResolvedValue([]),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      updateOne: jest.fn().mockImplementation(() => updateChain()),
      updateMany: jest.fn().mockImplementation(() => updateChain()),
      countDocuments: jest.fn().mockResolvedValue(0),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractCasesService, useClass: CasesService },
        { provide: getModelToken("CaseTemplate"), useValue: noopModel },
        { provide: getModelToken("Case"), useValue: { ...noopModel, ...mockCaseModel } },
        { provide: getModelToken("CaseHistory"), useValue: noopModel },
        {
          provide: getModelToken("Intervention"),
          useValue: { ...noopModel, ...mockInterventionModel },
        },
        { provide: getModelToken("Quote"), useValue: noopModel },
        { provide: getModelToken("Comment"), useValue: mockCommentModel },
      ],
    }).compile();

    service = module.get<AbstractCasesService>(AbstractCasesService) as CasesService;
  });

  it("creates a comment on a case", async () => {
    const doc = mockCommentDoc();
    mockCommentModel.create.mockResolvedValue(doc);

    const result = await service.createComment({
      organizationId: "org-1",
      entityType: "case",
      entityId: "case-1",
      body: "  Hello  ",
      authorId: "user-1",
      authorName: "Alice",
    });

    expect(mockCaseModel.findOne).toHaveBeenCalledWith({
      _id: "case-1",
      organizationId: "org-1",
      ...activeDocumentFilter,
    });
    expect(mockCommentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        entityType: "case",
        entityId: "case-1",
        caseId: "case-1",
        body: "Hello",
        authorId: "user-1",
      }),
    );
    expect(result).toMatchObject({
      id: "comment-1",
      body: "Hello",
      caseId: "case-1",
    });
  });

  it("creates a comment on an intervention", async () => {
    const doc = mockCommentDoc({
      entityType: "intervention",
      entityId: "int-1",
      body: "Sur place",
    });
    mockCommentModel.create.mockResolvedValue(doc);

    const result = await service.createComment({
      organizationId: "org-1",
      entityType: "intervention",
      entityId: "int-1",
      body: "Sur place",
      authorId: "user-1",
      authorName: "Alice",
    });

    expect(mockInterventionModel.findOne).toHaveBeenCalled();
    expect(result.entityType).toBe("intervention");
    expect(result.caseId).toBe("case-1");
  });

  it("rejects empty comment body", async () => {
    await expect(
      service.createComment({
        organizationId: "org-1",
        entityType: "case",
        entityId: "case-1",
        body: "   ",
        authorId: "user-1",
        authorName: "Alice",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lists comments for an entity", async () => {
    const docs = [mockCommentDoc()];
    mockCommentModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
      }),
    });

    const result = await service.listComments("org-1", "case", "case-1");

    expect(mockCommentModel.find).toHaveBeenCalledWith({
      organizationId: "org-1",
      entityType: "case",
      entityId: "case-1",
      ...activeDocumentFilter,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("comment-1");
  });

  it("updates a comment", async () => {
    const updated = mockCommentDoc({ body: "Updated" });
    mockCommentModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updated),
    });

    const result = await service.updateComment("comment-1", {
      organizationId: "org-1",
      body: "Updated",
    });

    expect(result.body).toBe("Updated");
  });

  it("throws when updating missing comment", async () => {
    mockCommentModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.updateComment("missing", { organizationId: "org-1", body: "x" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("soft-deletes a comment", async () => {
    const result = await service.deleteComment("comment-1", "org-1");
    expect(result).toEqual({ deleted: true });
    expect(mockCommentModel.updateOne).toHaveBeenCalledWith(
      { _id: "comment-1", organizationId: "org-1", ...activeDocumentFilter },
      { $set: { deletedAt: expect.any(Date) } },
    );
  });

  it("throws when deleting missing comment", async () => {
    mockCommentModel.updateOne.mockImplementation(() =>
      updateChain({ matchedCount: 0, modifiedCount: 0 }),
    );
    await expect(service.deleteComment("missing", "org-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
