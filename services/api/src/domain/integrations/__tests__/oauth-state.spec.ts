import { signOAuthState, verifyOAuthState } from "../oauth-state";

describe("oauth-state", () => {
  const prev = process.env.INTEGRATIONS_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterAll(() => {
    if (prev === undefined) delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
    else process.env.INTEGRATIONS_ENCRYPTION_KEY = prev;
  });

  it("round-trips organizationId", () => {
    const state = signOAuthState("org-42");
    expect(verifyOAuthState(state).organizationId).toBe("org-42");
  });

  it("rejects tampered state", () => {
    const state = signOAuthState("org-42");
    const [body] = state.split(".");
    expect(() => verifyOAuthState(`${body}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`)).toThrow(
      /falsifié|invalide/i,
    );
  });

  it("rejects expired state", () => {
    const now = Date.now();
    const state = signOAuthState("org-42", now);
    expect(() => verifyOAuthState(state, now + 16 * 60 * 1000)).toThrow(/expiré/i);
  });
});
