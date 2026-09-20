import { hasValidEmailVerificationOtp, isEmailVerified } from "./user.mapper";
import type { UserDocument } from "../../persistence/user.schema";

function doc(overrides: Partial<UserDocument> = {}): UserDocument {
  return {
    emailVerified: false,
    emailVerificationCodeHash: "hash",
    emailVerificationExpiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  } as UserDocument;
}

describe("user.mapper OTP helpers", () => {
  it("treats missing emailVerified as verified (legacy accounts)", () => {
    expect(isEmailVerified(doc({ emailVerified: undefined }))).toBe(true);
    expect(isEmailVerified(doc({ emailVerified: false }))).toBe(false);
  });

  it("accepts a still-valid hashed OTP", () => {
    expect(hasValidEmailVerificationOtp(doc())).toBe(true);
  });

  it("rejects expired or missing OTP", () => {
    expect(
      hasValidEmailVerificationOtp(doc({ emailVerificationExpiresAt: new Date(Date.now() - 1) })),
    ).toBe(false);
    expect(hasValidEmailVerificationOtp(doc({ emailVerificationCodeHash: undefined }))).toBe(false);
    expect(hasValidEmailVerificationOtp(doc({ emailVerificationExpiresAt: null }))).toBe(false);
  });
});
