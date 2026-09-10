import type { LocalInvoiceResponse } from "@planwise/shared";
import type { InvoiceDocument } from "../../persistence/invoice.schema";

export function toInvoiceResponse(doc: InvoiceDocument): LocalInvoiceResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    caseId: doc.caseId,
    quoteId: doc.quoteId,
    kind: doc.kind,
    status: doc.status,
    number: doc.number,
    draftNumber: doc.draftNumber,
    invoiceDate: doc.invoiceDate.toISOString(),
    situationNumber: doc.situationNumber,
    situationPercent: doc.situationPercent,
    amountHt: doc.amountHt,
    amountTtc: doc.amountTtc,
    lines: doc.lines,
    customer: doc.customer,
    seller: doc.seller,
    creditedInvoiceId: doc.creditedInvoiceId,
    caseTitle: doc.caseTitle,
    emailSends: doc.emailSends ?? [],
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    finalizedAt: doc.finalizedAt?.toISOString(),
  };
}
