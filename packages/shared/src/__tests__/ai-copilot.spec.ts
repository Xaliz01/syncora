import {
  applyCopilotPermissionGates,
  copilotContextFromPathname,
  parseCopilotCreateBody,
  parseCopilotModelOutput,
  planCopilotConfirmation,
  type CopilotProposedAction,
} from "../ai-copilot";
import { copilotQuotaExceededMessage, getAiQuotaLimit, resolveAiQuotaTier } from "../ai-quota";
import { organizationHasAddon } from "../subscription";

const INTERVENTION = "64b1c0c0c0c0c0c0c0c0c0c2";
const CASE_ID = "64b1c0c0c0c0c0c0c0c0c0c3";

describe("copilot interpretation", () => {
  const allowed = {
    interventionIds: [INTERVENTION],
    caseIds: [CASE_ID],
    customerIds: [] as string[],
  };

  it("binds a field report to the only allowed intervention and ignores invented prices", () => {
    const parsed = parseCopilotModelOutput(
      JSON.stringify({
        intent: "Compte-rendu",
        actions: [
          {
            type: "field_report",
            summary: "Groupe de sécurité",
            fieldReport: {
              reportText: "Le groupe de sécurité a été remplacé. L'eau chaude est rétablie.",
            },
          },
          {
            type: "quote_draft",
            summary: "Devis",
            quote: {
              subject: "Remplacement",
              customerName: "Martin",
              caseId: CASE_ID,
              lines: [{ description: "Groupe de sécurité", quantity: 1, unitPrice: 180 }],
            },
          },
        ],
      }),
      allowed,
    );

    expect(parsed.actions[0]?.fieldReport?.interventionId).toBe(INTERVENTION);
    expect(parsed.actions[0]?.status).toBe("proposed");
    expect(parsed.actions[1]?.quote?.lines[0]?.unitPrice).toBeNull();
    expect(parsed.actions[1]?.quote?.caseId).toBe(CASE_ID);
    expect(parsed.actions[1]?.quote?.createCase).toBe(false);
  });

  it("stores an unclear instruction without a CRM action", () => {
    const parsed = parseCopilotModelOutput("pas du json");
    expect(parsed.actions).toHaveLength(1);
    expect(parsed.actions[0]?.type).toBe("unsupported");
    expect(parsed.actions[0]?.status).toBe("needs_input");
  });

  it("drops an intervention id that was not loaded for this organization", () => {
    const parsed = parseCopilotModelOutput(
      JSON.stringify({
        intent: "Note",
        actions: [
          {
            type: "case_note",
            summary: "Note",
            note: {
              entityType: "case",
              entityId: "64b1c0c0c0c0c0c0c0c0c0c9",
              body: "Le client veut un rappel vendredi.",
            },
          },
        ],
      }),
      allowed,
    );
    expect(parsed.actions[0]?.note?.entityId).toBe(CASE_ID);
  });

  it("refuses confirmation when a quote price is missing and accepts an edited price", () => {
    const actions = parseCopilotModelOutput(
      JSON.stringify({
        intent: "Devis",
        actions: [
          {
            type: "quote_draft",
            summary: "Devis Martin",
            quote: {
              subject: "Chaudière",
              customerName: "Martin",
              lines: [{ description: "Déplacement", quantity: 1 }],
            },
          },
        ],
      }),
      { interventionIds: [], caseIds: [], customerIds: [] },
    ).actions;

    const blocked = planCopilotConfirmation(actions, [{ id: "a1", quote: actions[0]!.quote }]);
    expect(blocked.ok).toBe(false);

    const priced = planCopilotConfirmation(actions, [
      {
        id: "a1",
        quote: {
          ...actions[0]!.quote!,
          lines: [{ description: "Déplacement", quantity: 1, unitPrice: 80, tvaRate: 10 }],
        },
      },
    ]);
    expect(priced.ok).toBe(true);
    if (priced.ok) {
      expect(priced.edited).toBe(true);
      expect(priced.actions[0]?.quote?.lines[0]?.unitPrice).toBe(80);
    }
  });

  it("blocks a field report when the member cannot update interventions", () => {
    const action: CopilotProposedAction = {
      id: "a1",
      type: "field_report",
      summary: "Compte-rendu",
      status: "proposed",
      fieldReport: {
        interventionId: INTERVENTION,
        reportText: "Le groupe de sécurité a été remplacé aujourd'hui.",
      },
    };
    const gated = applyCopilotPermissionGates([action], (code) => code === "ai.field_report");
    expect(gated[0]?.status).toBe("needs_input");
    expect(gated[0]?.blockReason).toMatch(/droit/i);
  });
});

describe("copilot request parsing", () => {
  it("reads a case id from the current page and rejects an empty instruction", () => {
    expect(copilotContextFromPathname(`/cases/${CASE_ID}`).caseId).toBe(CASE_ID);
    expect(copilotContextFromPathname("/cases/new").caseId).toBeUndefined();
    expect(parseCopilotCreateBody({ transcript: "   " }).ok).toBe(false);
    const parsed = parseCopilotCreateBody({
      transcript: "Remplace le groupe de sécurité",
      context: { caseId: CASE_ID, pathname: `/cases/${CASE_ID}` },
    });
    expect(parsed.ok).toBe(true);
  });
});

describe("copilot quota tier", () => {
  it("uses the trial cap during a trial and the copilote cap with the addon", () => {
    expect(getAiQuotaLimit("copilot_voice", "trial")).toBe(20);
    expect(getAiQuotaLimit("copilot_voice", "essential")).toBe(15);
    expect(getAiQuotaLimit("copilot_voice", "copilot")).toBe(120);
    expect(getAiQuotaLimit("message_draft", "essential")).toBe(0);
    expect(
      resolveAiQuotaTier({ status: "trialing", hasAccess: true, activeAddons: ["ai_copilot"] }),
    ).toBe("trial");
    expect(
      resolveAiQuotaTier({ status: "active", hasAccess: true, activeAddons: ["ai_copilot"] }),
    ).toBe("copilot");
    expect(resolveAiQuotaTier({ status: "active", hasAccess: true, activeAddons: [] })).toBe(
      "essential",
    );
    expect(
      resolveAiQuotaTier({ status: "canceled", hasAccess: false, activeAddons: [] }),
    ).toBeNull();
    expect(copilotQuotaExceededMessage("trial", 20)).toMatch(/option Copilote/i);
  });

  it("unlocks the copilote addon during an active trial without a purchase", () => {
    expect(
      organizationHasAddon({ status: "trialing", hasAccess: true, activeAddons: [] }, "ai_copilot"),
    ).toBe(true);
    expect(
      organizationHasAddon({ status: "active", hasAccess: true, activeAddons: [] }, "ai_copilot"),
    ).toBe(false);
  });
});
