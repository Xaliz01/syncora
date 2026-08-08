import type { QuoteResponse, QuoteSummaryResponse } from "@planwise/shared";
import type { QuoteDocument, QuoteLineSubDoc } from "../../persistence/quote.schema";

export function computeLineTotals(line: QuoteLineSubDoc): { totalHt: number; totalTtc: number } {
  const totalHt = Math.round(line.quantity * line.unitPrice * 100) / 100;
  const totalTtc = Math.round(totalHt * (1 + line.tvaRate / 100) * 100) / 100;
  return { totalHt, totalTtc };
}

export function toQuoteResponse(doc: QuoteDocument, caseTitle?: string): QuoteResponse {
  const lines = (doc.lines ?? []).map((l) => {
    const { totalHt, totalTtc } = computeLineTotals(l);
    return {
      id: l.id,
      articleId: l.articleId,
      prestationId: l.prestationId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      tvaRate: l.tvaRate,
      unit: l.unit,
      totalHt,
      totalTtc,
    };
  });

  const totalHt = Math.round(lines.reduce((s, l) => s + l.totalHt, 0) * 100) / 100;
  const totalTtc = Math.round(lines.reduce((s, l) => s + l.totalTtc, 0) * 100) / 100;
  const totalTva = Math.round((totalTtc - totalHt) * 100) / 100;

  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    caseId: doc.caseId,
    caseTitle,
    quoteNumber: doc.quoteNumber,
    subject: doc.subject,
    notes: doc.notes,
    status: doc.status,
    validUntil: doc.validUntil?.toISOString(),
    lines,
    totalHt,
    totalTva,
    totalTtc,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}

export function toQuoteSummary(doc: QuoteDocument, caseTitle?: string): QuoteSummaryResponse {
  const lines = (doc.lines ?? []).map((l) => computeLineTotals(l));
  const totalHt = Math.round(lines.reduce((s, l) => s + l.totalHt, 0) * 100) / 100;
  const totalTtc = Math.round(lines.reduce((s, l) => s + l.totalTtc, 0) * 100) / 100;

  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    caseId: doc.caseId,
    caseTitle,
    quoteNumber: doc.quoteNumber,
    subject: doc.subject,
    status: doc.status,
    totalHt,
    totalTtc,
    validUntil: doc.validUntil?.toISOString(),
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
