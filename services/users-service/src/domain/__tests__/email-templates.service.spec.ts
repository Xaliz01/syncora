import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { EmailTemplatesService } from "../email-templates.service";

const TPL_ID = new Types.ObjectId().toString();

function makeDoc(overrides: Record<string, unknown> = {}) {
  const id = overrides._id ?? new Types.ObjectId(TPL_ID);
  return {
    _id: id,
    name: "Défaut",
    purpose: "prospect_outreach",
    subject: "Sujet",
    body: "Corps {{greeting}}",
    footer: "Footer",
    ctaLabel: "CTA",
    ctaUrl: "https://planwise.fr",
    isDefault: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("EmailTemplatesService", () => {
  const model = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) })),
  };

  let service: EmailTemplatesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailTemplatesService(model as never);
  });

  it("lists templates with total", async () => {
    const docs = [makeDoc()];
    model.find.mockReturnValue({
      sort: () => ({
        exec: async () => docs,
      }),
    });

    const res = await service.list({ purpose: "prospect_outreach" });
    expect(res.total).toBe(1);
    expect(res.templates[0]?.name).toBe("Défaut");
    expect(res.templates[0]?.id).toBe(TPL_ID);
  });

  it("creates a default and clears previous defaults", async () => {
    model.updateMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });
    model.create.mockResolvedValue(makeDoc({ name: "Nouveau", isDefault: true }));

    const res = await service.create({
      name: "Nouveau",
      purpose: "prospect_outreach",
      subject: "S",
      body: "B",
      footer: "",
      isDefault: true,
    });

    expect(model.updateMany).toHaveBeenCalled();
    expect(res.name).toBe("Nouveau");
  });

  it("refuses duplicate name for same purpose", async () => {
    model.exists.mockResolvedValue(null);
    model.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.create({
        name: "Défaut",
        purpose: "prospect_outreach",
        subject: "S",
        body: "B",
        footer: "",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("refuses deleting the only default", async () => {
    model.findById.mockReturnValue({
      exec: async () => makeDoc({ _id: new Types.ObjectId(TPL_ID), isDefault: true }),
    });
    model.countDocuments.mockResolvedValue(0);

    await expect(service.remove(TPL_ID)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws when template missing", async () => {
    model.findById.mockReturnValue({
      exec: async () => null,
    });
    await expect(service.getById(TPL_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
