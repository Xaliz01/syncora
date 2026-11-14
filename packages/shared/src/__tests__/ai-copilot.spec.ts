import {
  COPILOT_AUDIO_TOO_LARGE_MESSAGE,
  MAX_COPILOT_AUDIO_BASE64_CHARS,
  applyCopilotPermissionGates,
  copilotContextFromPathname,
  augmentCopilotActionsFromVoice,
  parseCopilotCreateBody,
  parseCopilotModelOutput,
  includeCopilotCustomerCreates,
  applyCopilotQuoteBilling,
  planCopilotConfirmation,
  repairCopilotPartyNames,
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
    quoteIds: [] as string[],
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

  it("turns a quote refused because of prices into a draft without those prices", () => {
    const parsed = parseCopilotModelOutput(
      JSON.stringify({
        intent: "Devis",
        actions: [
          {
            type: "unsupported",
            summary:
              "Création d'un devis pour Leon Marchand avec des détails de prix non autorisés.",
            quote: {
              subject: "Remplacement",
              customerName: "Leon Marchand",
              lines: [{ description: "Groupe de sécurité", quantity: 1, unitPrice: 180 }],
            },
          },
        ],
      }),
    );
    expect(parsed.actions[0]?.type).toBe("quote_draft");
    expect(parsed.actions[0]?.quote?.customerName).toBe("Leon Marchand");
    expect(parsed.actions[0]?.quote?.lines[0]?.unitPrice).toBeNull();
    expect(parsed.actions[0]?.status).toBe("proposed");
  });

  it("fills Leon Marchand on the customer and the quote when the model leaves the name blank", () => {
    const transcript =
      "Peux-tu créer un devis pour Leon Marchand, ajout d'une toiture 30 metre carré à 10 euros le metre";
    const parsed = parseCopilotModelOutput(
      JSON.stringify({
        intent: "court",
        actions: [
          {
            type: "customer_upsert",
            summary: "Création du client Leon Marchand.",
            customer: {
              mode: "create",
              kind: "individual",
              firstName: "",
              lastName: "",
              companyName: "",
            },
          },
          {
            type: "quote_draft",
            summary: "Création d'un devis pour l'ajout d'une toiture de 30 mètres carrés.",
            quote: {
              subject: "Devis",
              customerName: "",
              lines: [{ description: "Ajout d'une toiture", quantity: 30, unitPrice: 10 }],
            },
          },
        ],
      }),
      undefined,
      transcript,
    );
    expect(parsed.intent).not.toBe("court");
    expect(parsed.actions[0]?.customer?.firstName).toBe("Leon");
    expect(parsed.actions[0]?.customer?.lastName).toBe("Marchand");
    expect(parsed.actions[0]?.status).toBe("proposed");
    expect(parsed.actions[1]?.quote?.customerName).toBe("Leon Marchand");
    expect(parsed.actions[1]?.quote?.lines[0]?.quantity).toBe(30);
    expect(parsed.actions[1]?.quote?.lines[0]?.unitPrice).toBeNull();
    expect(parsed.actions[1]?.status).toBe("proposed");
  });

  it("confirms the quote together with the customer named in the same instruction", () => {
    const stored = repairCopilotPartyNames(
      [
        {
          id: "a1",
          type: "customer_upsert",
          summary: "Création du client Leon Marchand.",
          status: "needs_input",
          blockReason: "Indiquez le nom du client.",
          customer: { mode: "create", kind: "individual" },
        },
        {
          id: "a2",
          type: "quote_draft",
          summary: "Création d'un devis pour l'ajout d'une toiture de 30 mètres carrés.",
          status: "proposed",
          quote: {
            customerName: "Leon Marchand",
            createCase: true,
            subject: "Devis",
            lines: [
              { description: "Ajout d'une toiture", quantity: 30, unitPrice: 10, tvaRate: 20 },
            ],
          },
        },
      ],
      "Peux-tu créer un devis pour Leon Marchand, ajout d'une toiture 30 metre carré à 10 euros le metre",
    );
    const plan = planCopilotConfirmation(stored, [{ id: "a2", quote: stored[1]?.quote }]);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const actions = includeCopilotCustomerCreates(stored, plan.actions);
    expect(actions.map((action) => action.type)).toEqual(["customer_upsert", "quote_draft"]);
    expect(actions[0]?.customer?.firstName).toBe("Leon");
    expect(actions[0]?.customer?.lastName).toBe("Marchand");
  });

  it("proposes to accept Leon Marchand's quote and draft an invoice", () => {
    const quoteId = "64b1c0c0c0c0c0c0c0c0c0c4";
    const parsed = applyCopilotQuoteBilling(
      "Peux-tu valider le devis Leon marchand et créer la facture ?",
      {
        intent: "Demande de validation de devis et création de facture",
        actions: [
          {
            id: "a1",
            type: "unsupported",
            summary:
              "L'utilisateur demande de valider un devis et de créer une facture, ce qui n'est pas pris en charge par le CRM.",
            status: "needs_input",
          },
        ],
      },
      [
        {
          id: quoteId,
          caseId: CASE_ID,
          quoteNumber: "D-2026-014",
          subject: "Toiture",
          status: "draft",
          customerName: "Leon Marchand",
          totalHt: 300,
        },
      ],
    );
    expect(parsed.actions.map((action) => action.type)).toEqual(["quote_accept", "invoice_draft"]);
    expect(parsed.actions[0]?.quoteDecision?.quoteId).toBe(quoteId);
    expect(parsed.actions[1]?.invoiceDraft?.caseId).toBe(CASE_ID);
    expect(parsed.actions[1]?.summary).toMatch(/sans l'envoyer/);
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
      { interventionIds: [], caseIds: [], customerIds: [], quoteIds: [] },
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

  it("proposes to start the only planned intervention from a short command", () => {
    const parsed = augmentCopilotActionsFromVoice(
      "démarre",
      parseCopilotModelOutput("pas du json", {
        interventionIds: [INTERVENTION],
        caseIds: [CASE_ID],
        customerIds: [],
        quoteIds: [],
      }),
      [
        {
          id: INTERVENTION,
          caseId: CASE_ID,
          title: "Fuite chauffe-eau",
          status: "planned",
          scheduledStart: "2026-11-13T08:00:00.000Z",
        },
      ],
      { interventionIds: [INTERVENTION], caseIds: [CASE_ID], customerIds: [], quoteIds: [] },
    );
    expect(parsed.actions[0]?.type).toBe("intervention_status");
    expect(parsed.actions[0]?.interventionStatus).toEqual({
      operation: "start",
      interventionId: INTERVENTION,
    });
    expect(parsed.actions[0]?.status).toBe("proposed");
  });

  it("rejects audio larger than the copilote limit", () => {
    const parsed = parseCopilotCreateBody({
      transcript: "Compte-rendu de l'intervention",
      audioBase64: "A".repeat(MAX_COPILOT_AUDIO_BASE64_CHARS + 1),
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toBe(COPILOT_AUDIO_TOO_LARGE_MESSAGE);
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
