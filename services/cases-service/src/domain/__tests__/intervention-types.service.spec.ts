import { ConflictException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { InterventionTypesService } from "../intervention-types.service";

function makeDoc(overrides: Record<string, unknown> = {}) {
  const id = (overrides._id as Types.ObjectId | undefined) ?? new Types.ObjectId();
  return {
    _id: id,
    organizationId: "org-1",
    name: "Pose",
    description: "Installation",
    color: "#2563eb",
    isTestData: false,
    get: (key: string) => {
      if (key === "createdAt") return new Date("2026-01-01T00:00:00.000Z");
      if (key === "updatedAt") return new Date("2026-01-01T00:00:00.000Z");
      return undefined;
    },
    ...overrides,
  };
}

describe("InterventionTypesService", () => {
  const model = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  };

  let service: InterventionTypesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InterventionTypesService(model as never);
  });

  it("creates a type", async () => {
    model.create.mockResolvedValue(makeDoc());
    const res = await service.create({
      organizationId: "org-1",
      name: "Pose",
      description: "Installation",
      color: "#2563eb",
    });
    expect(res.name).toBe("Pose");
    expect(res.color).toBe("#2563eb");
  });

  it("lists types for an organization", async () => {
    model.find.mockReturnValue({
      sort: () => ({
        exec: async () => [makeDoc()],
      }),
    });
    const res = await service.list("org-1");
    expect(res.total).toBe(1);
    expect(res.types[0]?.name).toBe("Pose");
  });

  it("refuses duplicate names", async () => {
    model.create.mockRejectedValue({ code: 11000 });
    await expect(service.create({ organizationId: "org-1", name: "Pose" })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("throws when missing", async () => {
    model.findOne.mockReturnValue({ exec: async () => null });
    await expect(service.getById(new Types.ObjectId().toString(), "org-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
