import PDFDocument from "pdfkit";
import {
  INVOICE_MENTION_LABELS_FR,
  LOCAL_INVOICE_KIND_LABELS,
  invoiceTotalsFromLines,
  resolveInvoiceMentions,
  sanitizePdfText,
  type InvoiceMentionKey,
  type LocalInvoiceResponse,
} from "@planwise/shared";

const BRAND = "#6d28d9";
const TEXT = "#1e293b";
const MUTED = "#64748b";
const RULE = "#e2e8f0";

export async function renderInvoicePdf(
  invoice: LocalInvoiceResponse,
  options?: { logo?: Buffer | null },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const isCredit = invoice.kind === "credit_note";
    const numberLabel = invoice.number ?? invoice.draftNumber ?? "Brouillon";
    const title = isCredit ? `Avoir ${numberLabel}` : `Facture ${numberLabel}`;
    const contentBottom = () => doc.page.height - 80;
    const logo = options?.logo;

    let headerBottom = 72;
    if (logo) {
      try {
        doc.image(logo, 50, 28, { fit: [120, 48] });
        doc.fontSize(20).fillColor(BRAND);
        pdfText(doc, title, 185, 36, { width: 310 });
        if (invoice.seller?.name) {
          doc.fontSize(9).fillColor(MUTED);
          pdfText(doc, invoice.seller.name, 185, 58, { width: 310 });
        }
        headerBottom = 88;
      } catch {
        doc.fontSize(22).fillColor(BRAND);
        pdfText(doc, title, 50, 40);
        headerBottom = 72;
      }
    } else {
      doc.fontSize(22).fillColor(BRAND);
      pdfText(doc, title, 50, 40);
      if (invoice.seller?.name) {
        doc.fontSize(9).fillColor(MUTED);
        pdfText(doc, invoice.seller.name, 50, 64, { width: 495 });
        headerBottom = 82;
      }
    }

    doc.moveTo(50, headerBottom).lineTo(545, headerBottom).strokeColor(RULE).lineWidth(1).stroke();
    doc.y = headerBottom + 16;

    const metaTop = headerBottom + 16;
    doc.fontSize(9).fillColor(MUTED);
    pdfText(doc, LOCAL_INVOICE_KIND_LABELS[invoice.kind], 50, metaTop, {
      width: 495,
      lineBreak: false,
    });
    doc.y = metaTop + 14;
    pdfFieldInline(doc, "Date", formatDateFr(invoice.invoiceDate));
    if (invoice.kind === "credit_note") {
      pdfFieldInline(doc, "Type", "Avoir — à imputer sur la facture d’origine");
    }
    if (invoice.situationNumber) {
      pdfFieldInline(
        doc,
        "Situation",
        `n°${invoice.situationNumber}${
          invoice.situationPercent != null
            ? ` · avancement cumulé ${invoice.situationPercent} %`
            : ""
        }`,
      );
    }

    const leftX = 50;
    const rightX = 310;
    const colW = 235;
    const partiesTop = doc.y + 8;
    doc.fontSize(11).fillColor(BRAND);
    pdfText(doc, "Émetteur", leftX, partiesTop, { width: colW, lineBreak: false });
    pdfText(doc, "Destinataire", rightX, partiesTop, { width: colW, lineBreak: false });

    const sellerBlock = partyLines(invoice.seller);
    const customerBlock = [
      invoice.customer.displayName,
      invoice.customer.legalIdentifier ? `Identifiant ${invoice.customer.legalIdentifier}` : null,
      invoice.customer.email,
      invoice.customer.addressLine1,
      invoice.customer.addressLine2,
      [invoice.customer.postalCode, invoice.customer.city].filter(Boolean).join(" ") || null,
      invoice.customer.country,
    ].filter((line): line is string => Boolean(line?.trim()));

    const startY = partiesTop + 16;
    doc.fontSize(9).fillColor(TEXT);
    let sellerY = startY;
    for (const line of sellerBlock) {
      pdfText(doc, line, leftX, sellerY, { width: colW });
      sellerY += Math.max(12, doc.heightOfString(sanitizePdfText(line), { width: colW }));
    }
    let customerY = startY;
    for (const line of customerBlock) {
      pdfText(doc, line, rightX, customerY, { width: colW });
      customerY += Math.max(12, doc.heightOfString(sanitizePdfText(line), { width: colW }));
    }
    doc.y = Math.max(sellerY, customerY) + 6;

    if (invoice.caseTitle) {
      pdfSection(doc, "Dossier");
      pdfFieldInline(doc, "Référence", invoice.caseTitle);
    }

    pdfSection(doc, "Détail des prestations");
    const colX = { desc: 50, qty: 310, unit: 355, price: 405, tva: 460, total: 500 };
    const headerY = doc.y;
    doc.save();
    doc.rect(50, headerY - 4, 495, 16).fill("#f8fafc");
    doc.restore();
    doc.fontSize(8).fillColor(MUTED);
    pdfText(doc, "Description", colX.desc, headerY);
    pdfText(doc, "Qté", colX.qty, headerY);
    pdfText(doc, "Unité", colX.unit, headerY);
    pdfText(doc, "P.U. HT", colX.price, headerY);
    pdfText(doc, "TVA", colX.tva, headerY);
    pdfText(doc, "Total HT", colX.total, headerY);
    doc.y = headerY + 14;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(RULE).lineWidth(0.5).stroke();
    doc.y += 6;

    for (const line of invoice.lines) {
      if (doc.y > contentBottom()) {
        doc.addPage();
        doc.y = 50;
      }
      const lineY = doc.y;
      const safeDesc = sanitizePdfText(line.label);
      const qty = line.quantity;
      const unitPrice = Number.parseFloat(line.unitPriceHt || "0");
      const lineHt = qty * unitPrice;
      doc.fontSize(9).fillColor(TEXT);
      pdfText(doc, safeDesc, colX.desc, lineY, { width: 255 });
      const descHeight = doc.heightOfString(safeDesc, { width: 255 });
      pdfText(doc, String(qty), colX.qty, lineY, { width: 40 });
      pdfText(doc, line.unit ?? "unité", colX.unit, lineY, { width: 45 });
      pdfText(doc, formatNumber(unitPrice), colX.price, lineY, { width: 50 });
      pdfText(doc, `${line.tvaRate} %`, colX.tva, lineY, { width: 35 });
      pdfText(doc, formatNumber(lineHt), colX.total, lineY, { width: 45 });
      doc.y = lineY + Math.max(descHeight, 14) + 4;
    }

    const totals = invoiceTotalsFromLines(invoice.lines);
    const ht = Number.parseFloat(totals.amountHt);
    const ttc = Number.parseFloat(totals.amountTtc);
    const tva = ttc - ht;

    if (doc.y + 80 > contentBottom()) {
      doc.addPage();
      doc.y = 50;
    }
    doc.y += 6;
    doc.moveTo(380, doc.y).lineTo(545, doc.y).strokeColor(RULE).lineWidth(0.5).stroke();
    doc.y += 8;

    doc.fontSize(9).fillColor(MUTED);
    pdfText(doc, "Total HT :", 380, doc.y, { width: 80 });
    doc.fillColor(TEXT);
    pdfText(doc, formatCurrency(ht), 460, doc.y, { width: 85, align: "right" });
    doc.y += 14;
    doc.fillColor(MUTED);
    pdfText(doc, "TVA :", 380, doc.y, { width: 80 });
    doc.fillColor(TEXT);
    pdfText(doc, formatCurrency(tva), 460, doc.y, { width: 85, align: "right" });
    doc.y += 14;
    doc.fontSize(10).fillColor(BRAND);
    pdfText(doc, "Total TTC :", 380, doc.y, { width: 80 });
    pdfText(doc, formatCurrency(ttc), 460, doc.y, { width: 85, align: "right" });
    doc.y += 18;

    if (invoice.seller?.siret) {
      doc.fontSize(8).fillColor(MUTED);
      pdfText(doc, `SIRET ${invoice.seller.siret}`, 50, doc.y, { width: 495, lineBreak: false });
      doc.y += 12;
    }

    renderLegalMentionsBlock(doc, invoice);

    if (invoice.status === "draft") {
      stampDraftWatermarkOnPages(doc);
    }
    stampGeneratedByFooter(doc);
    doc.end();
  });
}

function partyLines(seller?: LocalInvoiceResponse["seller"]): string[] {
  if (!seller) return ["—"];
  return [
    seller.name,
    seller.legalForm
      ? `${seller.legalForm}${seller.shareCapital ? ` au capital de ${seller.shareCapital}` : ""}`
      : null,
    seller.siret ? `SIRET ${seller.siret}` : null,
    seller.rcsLabel || null,
    seller.vatNumber ? `N° TVA ${seller.vatNumber}` : null,
    seller.email,
    seller.addressLine1,
    seller.addressLine2,
    [seller.postalCode, seller.city].filter(Boolean).join(" ") || null,
    seller.country,
  ].filter((line): line is string => Boolean(line?.trim()));
}

function renderLegalMentionsBlock(doc: PDFKit.PDFDocument, invoice: LocalInvoiceResponse): void {
  const mentions = resolveInvoiceMentions(invoice.seller?.mentions);
  const keys: InvoiceMentionKey[] = [
    "paymentTerms",
    "latePenalties",
    "recoveryIndemnity",
    "discount",
    ...(mentions.vatFranchise ? (["vatFranchise"] as const) : []),
  ];
  if (doc.y + 70 > doc.page.height - 80) {
    doc.addPage();
    doc.y = 50;
  }
  pdfSection(doc, "Mentions légales");
  doc.fontSize(8).fillColor(MUTED);
  for (const key of keys) {
    const text = mentions[key];
    if (!text) continue;
    const line = `${INVOICE_MENTION_LABELS_FR[key]} : ${text}`;
    const height = doc.heightOfString(sanitizePdfText(line), { width: 495 });
    if (doc.y + height > doc.page.height - 80) {
      doc.addPage();
      doc.y = 50;
      doc.fontSize(8).fillColor(MUTED);
    }
    pdfText(doc, line, 50, doc.y, { width: 495 });
    doc.y += height + 4;
  }
}

function pdfText(
  doc: PDFKit.PDFDocument,
  text: string,
  x?: number,
  y?: number,
  options?: PDFKit.Mixins.TextOptions,
): PDFKit.PDFDocument {
  const safe = sanitizePdfText(text);
  if (x !== undefined && y !== undefined) {
    return options ? doc.text(safe, x, y, options) : doc.text(safe, x, y);
  }
  return options ? doc.text(safe, options) : doc.text(safe);
}

function pdfSection(doc: PDFKit.PDFDocument, title: string): void {
  const y = doc.y + 10;
  doc.fontSize(12).fillColor(BRAND);
  pdfText(doc, title, 50, y, { width: 495, lineBreak: false });
  const ruleY = y + 16;
  doc.moveTo(50, ruleY).lineTo(545, ruleY).strokeColor(RULE).lineWidth(0.5).stroke();
  doc.y = ruleY + 8;
}

function pdfFieldInline(doc: PDFKit.PDFDocument, label: string, value: string): void {
  const y = doc.y;
  doc.fontSize(9).fillColor(TEXT);
  pdfText(doc, `${label} : ${value}`, 50, y, { width: 495, lineBreak: false });
  doc.y = y + 14;
}

function stampDraftWatermarkOnPages(doc: PDFKit.PDFDocument): void {
  const savedX = doc.x;
  const savedY = doc.y;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.save();
    try {
      doc.fillOpacity(0.18);
      doc.rotate(-28, { origin: [300, 420] });
      doc.fontSize(64).fillColor("#94a3b8");
      doc.text("BROUILLON", 90, 390, { width: 420, lineBreak: false });
    } finally {
      doc.restore();
    }
  }
  doc.x = savedX;
  doc.y = savedY;
}

function stampGeneratedByFooter(doc: PDFKit.PDFDocument): void {
  const label = `Généré le ${formatDateTimeFr(new Date().toISOString())} — Planwise`;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const margins = doc.page.margins;
    const prevBottom = margins.bottom;
    margins.bottom = 0;
    try {
      const lineY = doc.page.height - 44;
      const textY = doc.page.height - 36;
      doc
        .moveTo(50, lineY)
        .lineTo(doc.page.width - 50, lineY)
        .strokeColor(RULE)
        .lineWidth(0.5)
        .stroke();
      doc.fontSize(7).fillColor("#94a3b8");
      pdfText(doc, label, 50, textY, {
        align: "center",
        width: doc.page.width - 100,
        lineBreak: false,
      });
    } finally {
      margins.bottom = prevBottom;
    }
  }
}

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTimeFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(value: number): string {
  return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
