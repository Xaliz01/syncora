import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { AuthUser, CopilotProposedAction } from "@planwise/shared";
import { AiCopilotService } from "../ai-copilot.service";

const SESSION_ID = "64b1c0c0c0c0c0c0c0c0c0c1";
const INTERVENTION_ID = "64b1c0c0c0c0c0c0c0c0c2";

const member: AuthUser = {
  id: "user-1",
  email: "alex@example.com",
  name: "Alex",
  organizationId: "org-1",
  role: "member",
  status: "active",
  permissions: [
    "ai.copilot",
    "ai.field_report",
    "interventions.update",
    "interventions.read",
    "cases.read",
    "quotes.create",
    "cases.create",
    "customers.create",
  ],
};

function fieldReportAction(): CopilotProposedAction {
  return {
    id: "a1",
    type: "field_report",
    summary: "Compte-rendu",
    status: "proposed",
    fieldReport: {
      interventionId: INTERVENTION_ID,
      reportText: "Le groupe de sécurité a été remplacé ce matin.",
    },
  };
}

function sessionDoc(actions: CopilotProposedAction[], status: "pending" | "rejected" = "pending") {
  return {
    _id: { toString: () => SESSION_ID },
    organizationId: "org-1",
    userId: member.id,
    userName: "Alex",
    transcript: "J'ai remplacé le groupe de sécurité.",
    audioAvailable: false,
    intent: "Compte-rendu",
    status,
    decision: null,
    message: undefined as string | undefined,
    actions,
    get(key: string) {
      if (key === "createdAt") return new Date("2026-11-12T10:00:00.000Z");
      return undefined;
    },
    markModified: jest.fn(),
    save: jest.fn(async function save(this: unknown) {
      return this;
    }),
  };
}

describe("AiCopilotService", () => {
  function setup() {
    const sessions = {
      create: jest.fn(
        async (input: Record<string, unknown>) =>
          sessionDoc([], "pending") && {
            ...sessionDoc((input.actions as CopilotProposedAction[]) ?? []),
            ...input,
            _id: { toString: () => SESSION_ID },
            get(key: string) {
              if (key === "createdAt") return new Date("2026-11-12T10:00:00.000Z");
              return undefined;
            },
            markModified: jest.fn(),
            save: jest.fn(async function save(this: unknown) {
              return this;
            }),
          },
      ),
      findOne: jest.fn().mockReturnValue({ exec: async () => null }),
      find: jest.fn().mockReturnValue({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              select: () => ({ exec: async () => [] }),
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockReturnValue({ exec: async () => 0 }),
    };
    const quota = {
      incrementIfAllowed: jest.fn().mockResolvedValue({
        allowed: true,
        used: 1,
        limit: 20,
        remaining: 19,
      }),
      release: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn(),
    };
    const llm = {
      isConfigured: jest.fn().mockReturnValue(true),
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          intent: "Compte-rendu",
          actions: [
            {
              type: "field_report",
              summary: "Groupe de sécurité",
              fieldReport: {
                reportText: "Le groupe de sécurité a été remplacé. L'eau chaude est rétablie.",
              },
            },
          ],
        }),
        provider: "openai",
      }),
    };
    const subscriptions = {
      getCurrentSubscription: jest.fn().mockResolvedValue({
        status: "trialing",
        hasAccess: true,
        activeAddons: [],
      }),
    };
    const customers = {
      createCustomer: jest.fn(),
      updateCustomer: jest.fn(),
      listCustomers: jest.fn(),
      getCustomer: jest.fn(),
    };
    const casesGateway = {
      createCase: jest.fn(),
      createQuote: jest.fn(),
      createComment: jest.fn(),
      createIntervention: jest.fn(),
    };
    const cases = { getCase: jest.fn() };
    const interventions = {
      getIntervention: jest.fn(),
      listInterventions: jest.fn(),
      confirmFieldReport: jest.fn().mockResolvedValue({
        id: INTERVENTION_ID,
        caseId: "64b1c0c0c0c0c0c0c0c0c0c3",
        title: "Fuite",
        organizationId: "org-1",
      }),
    };
    const permissions = {
      resolveEffectivePermissions: jest.fn(async () => ({ permissions: member.permissions })),
    };
    const service = new AiCopilotService(
      sessions as never,
      quota as never,
      llm as never,
      subscriptions as never,
      customers as never,
      casesGateway as never,
      cases as never,
      interventions as never,
      permissions as never,
    );
    return { service, sessions, quota, llm, customers, casesGateway, interventions, permissions };
  }

  it("stores a proposal and does not write the CRM before confirmation", async () => {
    const { service, interventions, customers, casesGateway } = setup();
    const created = await service.createSession(member, {
      transcript: "J'ai remplacé le groupe de sécurité.",
    });
    expect(created.status).toBe("pending");
    expect(created.organizationId).toBe("org-1");
    expect(interventions.confirmFieldReport).not.toHaveBeenCalled();
    expect(customers.createCustomer).not.toHaveBeenCalled();
    expect(casesGateway.createQuote).not.toHaveBeenCalled();
  });

  it("does not call the model when the monthly quota is exhausted", async () => {
    const ctx = setup();
    ctx.quota.incrementIfAllowed.mockResolvedValue({
      allowed: false,
      used: 20,
      limit: 20,
      remaining: 0,
    });
    await expect(
      ctx.service.createSession(member, { transcript: "Nouveau compte-rendu" }),
    ).rejects.toMatchObject({ status: 429 });
    expect(ctx.llm.complete).not.toHaveBeenCalled();
    expect(ctx.sessions.create).not.toHaveBeenCalled();
    expect(ctx.interventions.confirmFieldReport).not.toHaveBeenCalled();
  });

  it("fails closed without the copilote permission", async () => {
    const ctx = setup();
    const outsider: AuthUser = { ...member, permissions: ["cases.read"] };
    await expect(
      ctx.service.createSession(outsider, { transcript: "Note de chantier" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.quota.incrementIfAllowed).not.toHaveBeenCalled();
  });

  it("keeps the transcript when the model is down and writes nothing", async () => {
    const ctx = setup();
    ctx.llm.complete.mockRejectedValue(new Error("timeout"));
    const created = await ctx.service.createSession(member, {
      transcript: "Prévoir une relance vendredi.",
    });
    expect(created.status).toBe("llm_unavailable");
    expect(created.transcript).toMatch(/relance/);
    expect(ctx.quota.release).toHaveBeenCalled();
    expect(ctx.interventions.confirmFieldReport).not.toHaveBeenCalled();
  });

  it("writes the field report only after confirm, and nothing on reject", async () => {
    const ctx = setup();
    const pending = sessionDoc([fieldReportAction()]);
    ctx.sessions.findOne.mockReturnValue({ exec: async () => pending });
    await ctx.service.decide(member, SESSION_ID, { decision: "reject" });
    expect(ctx.interventions.confirmFieldReport).not.toHaveBeenCalled();
    expect(pending.status).toBe("rejected");

    const again = sessionDoc([fieldReportAction()]);
    ctx.sessions.findOne.mockReturnValue({ exec: async () => again });
    const confirmed = await ctx.service.decide(member, SESSION_ID, {
      decision: "confirm",
      actions: [
        {
          id: "a1",
          fieldReport: { reportText: "Le groupe de sécurité a été remplacé ce matin." },
        },
      ],
    });
    expect(ctx.interventions.confirmFieldReport).toHaveBeenCalledWith(
      INTERVENTION_ID,
      "org-1",
      "Le groupe de sécurité a été remplacé ce matin.",
    );
    expect(confirmed.decision).toBe("confirmed");
    expect(confirmed.actions[0]?.result?.href).toBe("/cases/64b1c0c0c0c0c0c0c0c0c0c3");
    expect(ctx.customers.createCustomer).not.toHaveBeenCalled();
  });

  it("does not create a quote when the confirmed draft has no price", async () => {
    const ctx = setup();
    const action: CopilotProposedAction = {
      id: "a1",
      type: "quote_draft",
      summary: "Devis",
      status: "proposed",
      quote: {
        customerName: "Martin",
        createCase: true,
        subject: "Chaudière",
        lines: [{ description: "Déplacement", quantity: 1, unitPrice: null, tvaRate: 20 }],
      },
    };
    ctx.sessions.findOne.mockReturnValue({ exec: async () => sessionDoc([action]) });
    await expect(
      ctx.service.decide(member, SESSION_ID, {
        decision: "confirm",
        actions: [{ id: "a1", quote: action.quote }],
      }),
    ).rejects.toThrow(/prix/i);
    expect(ctx.casesGateway.createQuote).not.toHaveBeenCalled();
    expect(ctx.casesGateway.createCase).not.toHaveBeenCalled();
  });

  it("refuses to confirm a field report without the field-report permission", async () => {
    const ctx = setup();
    ctx.sessions.findOne.mockReturnValue({
      exec: async () => sessionDoc([fieldReportAction()]),
    });
    const limited: AuthUser = {
      ...member,
      permissions: ["ai.copilot", "cases.read"],
    };
    await expect(
      ctx.service.decide(limited, SESSION_ID, {
        decision: "confirm",
        actions: [
          {
            id: "a1",
            fieldReport: { reportText: "Le groupe de sécurité a été remplacé ce matin." },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.interventions.confirmFieldReport).not.toHaveBeenCalled();
  });

  it("refuses a field report when the live permission was revoked", async () => {
    const ctx = setup();
    ctx.permissions.resolveEffectivePermissions.mockResolvedValue({
      permissions: member.permissions.filter((code) => code !== "ai.field_report"),
    });
    ctx.sessions.findOne.mockReturnValue({
      exec: async () => sessionDoc([fieldReportAction()]),
    });
    await expect(
      ctx.service.decide(member, SESSION_ID, {
        decision: "confirm",
        actions: [
          {
            id: "a1",
            fieldReport: { reportText: "Le groupe de sécurité a été remplacé ce matin." },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.interventions.confirmFieldReport).not.toHaveBeenCalled();
  });

  it("hides another organization's history", async () => {
    const ctx = setup();
    await expect(ctx.service.getSession(member, "64b1c0c0c0c0c0c0c0c0c0c9")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(ctx.sessions.findOne).toHaveBeenCalledWith({
      _id: "64b1c0c0c0c0c0c0c0c0c0c9",
      organizationId: "org-1",
    });
    await ctx.service.listSessions(member, 20, 0);
    expect(ctx.sessions.find).toHaveBeenCalledWith({ organizationId: "org-1" });
  });
});
