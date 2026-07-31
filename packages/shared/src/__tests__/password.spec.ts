import { getPasswordPolicyError, isPasswordPolicyValid, PASSWORD_MIN_LENGTH } from "../password";

describe("password policy", () => {
  it(`requires at least ${PASSWORD_MIN_LENGTH} characters with a letter and a digit`, () => {
    expect(isPasswordPolicyValid("short1")).toBe(false);
    expect(isPasswordPolicyValid("onlyletters")).toBe(false);
    expect(isPasswordPolicyValid("12345678")).toBe(false);
    expect(isPasswordPolicyValid("secret12")).toBe(true);
  });

  it("returns a French error message for invalid passwords", () => {
    expect(getPasswordPolicyError("ab")).toMatch(/8 caractères/);
    expect(getPasswordPolicyError("12345678")).toMatch(/lettre/);
    expect(getPasswordPolicyError("abcdefgh")).toMatch(/chiffre/);
    expect(getPasswordPolicyError("secret12")).toBeNull();
  });
});
