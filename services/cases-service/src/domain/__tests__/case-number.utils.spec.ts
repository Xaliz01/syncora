import { generateCaseNumber } from "../utils/case-number.utils";
import { isDuplicateKeyError } from "../utils";

describe("isDuplicateKeyError", () => {
  it("detects code 11000 and nested E11000 messages", () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(isDuplicateKeyError({ cause: { code: 11000 } })).toBe(true);
    expect(isDuplicateKeyError(new Error("E11000 duplicate key"))).toBe(true);
    expect(isDuplicateKeyError({ message: "boom", cause: { message: "E11000 dup" } })).toBe(true);
    expect(isDuplicateKeyError(new Error("other"))).toBe(false);
  });
});

describe("generateCaseNumber", () => {
  it("allocates via atomic counter after aligning on max existing", async () => {
    const findOneAndUpdate = jest.fn().mockResolvedValue({ seq: 8 });
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const caseModel = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ caseNumber: "2026-0007" }),
            }),
          }),
        }),
      }),
      db: {
        collection: jest.fn().mockReturnValue({ updateOne, findOneAndUpdate }),
      },
    };

    const number = await generateCaseNumber(caseModel as never, "org-1", new Date("2026-06-01"));

    expect(number).toBe("2026-0008");
    expect(updateOne).toHaveBeenCalledWith(
      { organizationId: "org-1", year: 2026 },
      { $max: { seq: 7 }, $setOnInsert: { organizationId: "org-1", year: 2026 } },
      { upsert: true },
    );
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { organizationId: "org-1", year: 2026 },
      { $inc: { seq: 1 } },
      { returnDocument: "after" },
    );
  });

  it("retries when concurrent counter upsert hits duplicate key", async () => {
    const findOneAndUpdate = jest.fn().mockResolvedValue({ seq: 3 });
    const updateOne = jest
      .fn()
      .mockRejectedValueOnce({ code: 11000 })
      .mockResolvedValueOnce({ acknowledged: true });
    const caseModel = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(null),
            }),
          }),
        }),
      }),
      db: {
        collection: jest.fn().mockReturnValue({ updateOne, findOneAndUpdate }),
      },
    };

    const number = await generateCaseNumber(caseModel as never, "org-1", new Date("2026-01-15"));

    expect(number).toBe("2026-0003");
    expect(updateOne).toHaveBeenNthCalledWith(
      2,
      { organizationId: "org-1", year: 2026 },
      {
        $max: { seq: 0 },
      },
    );
  });
});
