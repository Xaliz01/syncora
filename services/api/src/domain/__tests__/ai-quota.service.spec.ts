import { AiQuotaService } from "../ai-quota.service";

describe("AiQuotaService", () => {
  function setup(overrides?: {
    count?: number;
    update?: () => Promise<unknown>;
    updateError?: unknown;
  }) {
    const findOne = jest.fn().mockReturnValue({
      exec: async () => (overrides?.count == null ? null : { count: overrides.count }),
    });
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: async () => {
        if (overrides?.updateError) throw overrides.updateError;
        if (overrides?.update) return overrides.update();
        return { count: (overrides?.count ?? 0) + 1 };
      },
    });
    const updateOne = jest.fn().mockReturnValue({ exec: async () => ({}) });
    const service = new AiQuotaService({
      findOne,
      findOneAndUpdate,
      updateOne,
    } as never);
    return { service, findOne, findOneAndUpdate, updateOne };
  }

  it("reports remaining voice quota without incrementing", async () => {
    const { service, findOneAndUpdate } = setup({ count: 4 });
    const status = await service.getStatus("org-1", "copilot_voice", "essential", "2026-11");
    expect(status).toEqual({ allowed: true, used: 4, limit: 15, remaining: 11 });
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("does not call the counter when the tier limit is zero", async () => {
    const { service, findOneAndUpdate } = setup({ count: 0 });
    const status = await service.incrementIfAllowed(
      "org-1",
      "message_draft",
      "essential",
      "2026-11",
    );
    expect(status.allowed).toBe(false);
    expect(status.limit).toBe(0);
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("increments under the cap and refuses a duplicate insert once the cap is reached", async () => {
    const allowed = setup();
    const ok = await allowed.service.incrementIfAllowed("org-1", "copilot_voice", "trial", "trial");
    expect(ok.allowed).toBe(true);
    expect(ok.remaining).toBe(19);

    const denied = setup({ count: 20, updateError: { code: 11000 } });
    const blocked = await denied.service.incrementIfAllowed(
      "org-1",
      "copilot_voice",
      "trial",
      "trial",
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    await denied.service.release("org-1", "copilot_voice", "trial");
    expect(denied.updateOne).toHaveBeenCalledWith(
      { organizationId: "org-1", usage: "copilot_voice", period: "trial", count: { $gt: 0 } },
      { $inc: { count: -1 } },
    );
  });
});
