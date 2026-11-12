import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InterventionsService } from "../interventions.service";
import { toInterventionResponse } from "../mappers/intervention.mapper";

describe("confirmFieldReport", () => {
  const organizationId = "org-1";
  const interventionId = "64b1c0c0c0c0c0c0c0c0c0c2";

  function serviceWith(doc: unknown) {
    const findOneAndUpdate = jest.fn().mockReturnValue({ exec: async () => doc });
    const interventions = new InterventionsService(
      { findOneAndUpdate } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { interventions, findOneAndUpdate };
  }

  it("stores the confirmed text without changing the intervention status", async () => {
    const saved = {
      _id: { toString: () => interventionId },
      organizationId,
      caseId: "64b1c0c0c0c0c0c0c0c0c0c3",
      title: "Fuite",
      status: "completed",
      billingStatus: "none",
      fieldReport: "Le groupe de sécurité a été remplacé.",
      fieldReportConfirmedAt: new Date("2026-11-12T12:00:00.000Z"),
      isTestData: false,
      get: () => undefined,
    };
    const { interventions, findOneAndUpdate } = serviceWith(saved);
    const result = await interventions.confirmFieldReport(
      interventionId,
      organizationId,
      "Le groupe de sécurité a été remplacé.",
    );
    const filter = findOneAndUpdate.mock.calls[0]?.[0] as { organizationId: string };
    const update = findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> };
    expect(filter.organizationId).toBe(organizationId);
    expect(update.$set.fieldReport).toBe("Le groupe de sécurité a été remplacé.");
    expect(update.$set.status).toBeUndefined();
    expect(result.fieldReport).toBe("Le groupe de sécurité a été remplacé.");
    expect(result.status).toBe("completed");
    expect(toInterventionResponse(saved as never).fieldReportConfirmedAt).toBe(
      "2026-11-12T12:00:00.000Z",
    );
  });

  it("does not write when the text is empty or the intervention is outside the organization", async () => {
    const { interventions, findOneAndUpdate } = serviceWith(null);
    await expect(
      interventions.confirmFieldReport(interventionId, organizationId, "court"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findOneAndUpdate).not.toHaveBeenCalled();
    await expect(
      interventions.confirmFieldReport(
        interventionId,
        organizationId,
        "Le groupe de sécurité a été remplacé.",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
