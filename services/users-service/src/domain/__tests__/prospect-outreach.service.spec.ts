import { Types } from "mongoose";
import { ProspectOutreachService } from "../prospect-outreach.service";

function makeDoc(overrides: Record<string, unknown> = {}) {
  const sentAt = (overrides.sentAt as Date) ?? new Date("2026-01-01T00:00:00.000Z");
  return {
    _id: overrides._id ?? new Types.ObjectId(),
    siren: "123456789",
    companyName: "Plomberie Dupont",
    email: "jean@example.fr",
    sentByUserId: "staff-1",
    sentByEmail: "staff@planwise.fr",
    subject: "Planwise",
    status: "sent",
    sentAt,
    emailSends: [],
    comment: "",
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("ProspectOutreachService", () => {
  const model = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
  };

  let service: ProspectOutreachService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProspectOutreachService(model as never);
  });

  it("appends a send entry and keeps a prior history item", async () => {
    model.findOne.mockReturnValue({ exec: async () => makeDoc() });
    const first = {
      sentAt: new Date("2026-01-01T00:00:00.000Z"),
      subject: "Premier",
      toEmail: "jean@example.fr",
      sentByUserId: "staff-1",
      sentByEmail: "staff@planwise.fr",
      status: "sent" as const,
      templateId: "tpl-1",
      templateName: "Beta",
    };
    const second = {
      sentAt: new Date("2026-09-13T00:00:00.000Z"),
      subject: "Relance",
      toEmail: "jean@example.fr",
      sentByUserId: "staff-1",
      sentByEmail: "staff@planwise.fr",
      status: "sent" as const,
      templateId: "tpl-2",
      templateName: "Relance",
    };
    model.findOneAndUpdate.mockReturnValue({
      exec: async () =>
        makeDoc({
          subject: "Relance",
          sentAt: second.sentAt,
          emailSends: [first, second],
        }),
    });

    const res = await service.createProspectOutreach({
      siren: "123456789",
      companyName: "Plomberie Dupont",
      email: "jean@example.fr",
      sentByUserId: "staff-1",
      sentByEmail: "staff@planwise.fr",
      subject: "Relance",
      status: "sent",
      templateId: "tpl-2",
      templateName: "Relance",
    });

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { siren: "123456789" },
      expect.objectContaining({
        $set: expect.objectContaining({ subject: "Relance", status: "sent" }),
        $push: {
          emailSends: expect.objectContaining({
            subject: "Relance",
            templateId: "tpl-2",
            templateName: "Relance",
            status: "sent",
          }),
        },
      }),
      { upsert: true, new: true },
    );
    expect(res.emailSends).toHaveLength(2);
    expect(res.emailSends?.[0]?.subject).toBe("Premier");
    expect(res.emailSends?.[1]?.subject).toBe("Relance");
  });

  it("does not append a send entry for noted or email_not_found", async () => {
    model.findOne.mockReturnValue({ exec: async () => null });
    model.findOneAndUpdate.mockReturnValue({
      exec: async () =>
        makeDoc({
          status: "email_not_found",
          email: "",
          emailSends: [],
        }),
    });

    await service.createProspectOutreach({
      siren: "123456789",
      companyName: "Plomberie Dupont",
      email: "",
      sentByUserId: "staff-1",
      sentByEmail: "staff@planwise.fr",
      subject: "Email non trouvé",
      status: "email_not_found",
    });

    const update = model.findOneAndUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect(update.$push).toBeUndefined();
  });

  it("leaves emailSends unchanged when upserting a comment", async () => {
    const existing = makeDoc({
      emailSends: [
        {
          sentAt: new Date("2026-01-01T00:00:00.000Z"),
          subject: "Premier",
          toEmail: "jean@example.fr",
          sentByUserId: "staff-1",
          sentByEmail: "staff@planwise.fr",
          status: "sent",
        },
      ],
    });
    model.findOne.mockReturnValue({ exec: async () => existing });

    const res = await service.upsertProspectComment({
      siren: "123456789",
      companyName: "Plomberie Dupont",
      comment: "Vu sur LinkedIn",
      sentByUserId: "staff-1",
      sentByEmail: "staff@planwise.fr",
    });

    expect(existing.save).toHaveBeenCalled();
    expect(res.emailSends).toHaveLength(1);
    expect(res.emailSends?.[0]?.subject).toBe("Premier");
  });
});
