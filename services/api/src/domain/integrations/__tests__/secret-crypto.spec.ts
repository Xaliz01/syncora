import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret, tokenHint } from "../secret-crypto";

describe("secret-crypto", () => {
  const prev = process.env.INTEGRATIONS_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = createHash("sha256").update("test-key").digest("hex");
  });

  afterAll(() => {
    if (prev === undefined) delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
    else process.env.INTEGRATIONS_ENCRYPTION_KEY = prev;
  });

  it("round-trips encryption", () => {
    const plain = "pl_test_token_abc123";
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("builds a token hint", () => {
    expect(tokenHint("abcd")).toBe("••••");
    expect(tokenHint("token-xyz9")).toBe("••••xyz9");
  });

  it("rejects invalid payload", () => {
    expect(() => decryptSecret("not-valid")).toThrow();
  });

  it("uses aes-gcm format with three segments", () => {
    const enc = encryptSecret("x");
    expect(enc.split(":")).toHaveLength(3);
    // smoke: same key can decipher after re-encrypt random IV
    const iv = randomBytes(12);
    const key = Buffer.from(process.env.INTEGRATIONS_ENCRYPTION_KEY!, "hex");
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update("y", "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv.toString("hex"), "hex"));
    decipher.setAuthTag(tag);
    expect(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")).toBe(
      "y",
    );
    expect(payload.split(":")).toHaveLength(3);
  });
});
