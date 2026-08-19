import type { Model } from "mongoose";
import type { CaseDocument } from "../../persistence/case.schema";
import { isDuplicateKeyError } from "../utils";

const COUNTERS_COLLECTION = "case_number_counters";

async function maxExistingSeq(
  caseModel: Model<CaseDocument>,
  organizationId: string,
  year: number,
): Promise<number> {
  const prefix = `${year}-`;
  const latest = await caseModel
    .findOne({ organizationId, caseNumber: { $regex: `^${prefix}` } })
    .sort({ caseNumber: -1 })
    .select("caseNumber")
    .lean()
    .exec();

  const current = latest?.caseNumber;
  if (typeof current === "string" && current.startsWith(prefix)) {
    const parsed = Number.parseInt(current.slice(prefix.length), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function formatCaseNumber(year: number, seq: number): string {
  return `${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Génère le prochain numéro `YYYY-0001` pour l’organisation (inclut les soft-deleted).
 * Compteur atomique Mongo pour supporter les créations parallèles (injection démo).
 */
export async function generateCaseNumber(
  caseModel: Model<CaseDocument>,
  organizationId: string,
  at: Date = new Date(),
): Promise<string> {
  const year = at.getFullYear();
  const counters = caseModel.db.collection(COUNTERS_COLLECTION);
  const maxExisting = await maxExistingSeq(caseModel, organizationId, year);

  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      // Aligne le plancher sur le max déjà attribué (idempotent sous concurrence via $max).
      try {
        await counters.updateOne(
          { organizationId, year },
          { $max: { seq: maxExisting }, $setOnInsert: { organizationId, year } },
          { upsert: true },
        );
      } catch (err) {
        // Deux upserts concurrentes sur l’index unique → retry sans upsert.
        if (!isDuplicateKeyError(err)) throw err;
        await counters.updateOne({ organizationId, year }, { $max: { seq: maxExisting } });
      }

      const updated = await counters.findOneAndUpdate(
        { organizationId, year },
        { $inc: { seq: 1 } },
        { returnDocument: "after" },
      );

      const doc = updated as { seq?: number; value?: { seq?: number } } | null;
      const seq = Number(doc?.seq ?? doc?.value?.seq);
      if (Number.isFinite(seq) && seq > 0) {
        return formatCaseNumber(year, seq);
      }
      throw new Error("case_number_counters returned empty seq");
    } catch (err) {
      lastError = err;
      if (
        !isDuplicateKeyError(err) &&
        !(err instanceof Error && err.message.includes("empty seq"))
      ) {
        throw err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to allocate case number");
}
