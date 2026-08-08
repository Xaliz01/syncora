import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { NotFoundException } from "@nestjs/common";
import { activeDocumentFilter } from "@planwise/shared";
import { QuotesService } from "../quotes.service";
import { AbstractQuotesService } from "../ports/quotes.service.port";

describe("QuotesService", () => {
  let service: QuotesService;
  let mockCaseModel: { findOne: jest.Mock };
  let mockQuoteModel: { create: jest.Mock; findOne: jest.Mock };

  const year = new Date().getFullYear();

  const mockQuoteDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "quote-1" },
    organizationId: "org-1",
    caseId: "case-1",
    quoteNumber: `DEV-${year}-0001`,
    subject: "Devis test",
    notes: undefined,
    status: "draft",
    validUntil: undefined,
    lines: [],
    deletedAt: null,
    isTestData: false,
    get: jest.fn((key: string) =>
      key === "createdAt" || key === "updatedAt" ? new Date("2026-01-01T10:00:00.000Z") : undefined,
    ),
    ...overrides,
  });

  beforeEach(async () => {
    mockCaseModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: { toString: () => "case-1" },
          title: "Dossier test",
        }),
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ title: "Dossier test" }),
        }),
      }),
    };
    mockQuoteModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(null),
            }),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractQuotesService, useClass: QuotesService },
        { provide: getModelToken("Case"), useValue: mockCaseModel },
        { provide: getModelToken("Quote"), useValue: mockQuoteModel },
      ],
    }).compile();

    service = module.get<AbstractQuotesService>(AbstractQuotesService) as QuotesService;
  });

  it("creates a quote with DEV-YYYY-0001 when none exist for the org", async () => {
    const doc = mockQuoteDoc();
    mockQuoteModel.create.mockResolvedValue(doc);

    const result = await service.createQuote({
      organizationId: "org-1",
      caseId: "case-1",
      subject: "Devis test",
      lines: [],
    });

    expect(mockCaseModel.findOne).toHaveBeenCalledWith({
      _id: "case-1",
      organizationId: "org-1",
      ...activeDocumentFilter,
    });
    expect(mockQuoteModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        caseId: "case-1",
        quoteNumber: `DEV-${year}-0001`,
        status: "draft",
      }),
    );
    expect(result.quoteNumber).toBe(`DEV-${year}-0001`);
  });

  it("increments from the latest quote number for the org", async () => {
    mockQuoteModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ quoteNumber: `DEV-${year}-0007` }),
          }),
        }),
      }),
    });
    mockQuoteModel.create.mockResolvedValue(mockQuoteDoc({ quoteNumber: `DEV-${year}-0008` }));

    await service.createQuote({
      organizationId: "org-1",
      caseId: "case-1",
      lines: [],
    });

    expect(mockQuoteModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ quoteNumber: `DEV-${year}-0008` }),
    );
  });

  it("retries quote number allocation on duplicate key", async () => {
    mockQuoteModel.findOne
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(null),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ quoteNumber: `DEV-${year}-0001` }),
            }),
          }),
        }),
      });

    const dup = Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
    mockQuoteModel.create
      .mockRejectedValueOnce(dup)
      .mockResolvedValueOnce(mockQuoteDoc({ quoteNumber: `DEV-${year}-0002` }));

    const result = await service.createQuote({
      organizationId: "org-1",
      caseId: "case-1",
      lines: [],
    });

    expect(mockQuoteModel.create).toHaveBeenCalledTimes(2);
    expect(result.quoteNumber).toBe(`DEV-${year}-0002`);
  });

  it("throws NotFoundException when case is missing", async () => {
    mockCaseModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.createQuote({
        organizationId: "org-1",
        caseId: "missing",
        lines: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockQuoteModel.create).not.toHaveBeenCalled();
  });
});
