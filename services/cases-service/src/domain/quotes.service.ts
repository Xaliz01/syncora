import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  activeDocumentFilter,
  type CreateQuoteBody,
  type QuoteResponse,
  type QuoteSummaryResponse,
  type UpdateQuoteBody,
} from "@planwise/shared";
import type { CaseDocument } from "../persistence/case.schema";
import type { QuoteDocument } from "../persistence/quote.schema";
import { AbstractQuotesService } from "./ports/quotes.service.port";
import { toQuoteResponse, toQuoteSummary } from "./mappers/quote.mapper";
import { isDuplicateKeyError } from "./utils";

const QUOTE_NUMBER_MAX_ATTEMPTS = 8;

@Injectable()
export class QuotesService extends AbstractQuotesService {
  constructor(
    @InjectModel("Quote")
    private readonly quoteModel: Model<QuoteDocument>,
    @InjectModel("Case")
    private readonly caseModel: Model<CaseDocument>,
  ) {
    super();
  }

  async createQuote(body: CreateQuoteBody): Promise<QuoteResponse> {
    const caseDoc = await this.caseModel
      .findOne({ _id: body.caseId, organizationId: body.organizationId, ...activeDocumentFilter })
      .exec();
    if (!caseDoc) throw new NotFoundException("Case not found");

    let lastError: unknown;
    for (let attempt = 0; attempt < QUOTE_NUMBER_MAX_ATTEMPTS; attempt++) {
      try {
        const quoteNumber = await this.generateQuoteNumber(body.organizationId);
        const doc = await this.quoteModel.create({
          organizationId: body.organizationId,
          caseId: body.caseId,
          quoteNumber,
          subject: body.subject,
          notes: body.notes,
          validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
          lines: (body.lines ?? []).map((l) => ({
            articleId: l.articleId,
            prestationId: l.prestationId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            tvaRate: l.tvaRate,
            unit: l.unit,
          })),
          status: "draft",
          isTestData: body.isTestData === true,
        });
        return toQuoteResponse(doc, caseDoc.title);
      } catch (err) {
        if (!isDuplicateKeyError(err)) throw err;
        lastError = err;
      }
    }
    throw lastError;
  }

  async listQuotes(
    organizationId: string,
    filters?: { caseId?: string; status?: string },
  ): Promise<QuoteSummaryResponse[]> {
    const query: Record<string, unknown> = { organizationId, ...activeDocumentFilter };
    if (filters?.caseId) query.caseId = filters.caseId;
    if (filters?.status) query.status = filters.status;

    const docs = await this.quoteModel.find(query).sort({ createdAt: -1 }).exec();

    const caseIds = [...new Set(docs.map((d) => d.caseId))];
    const cases = await this.caseModel
      .find({ _id: { $in: caseIds }, ...activeDocumentFilter })
      .select("_id title")
      .exec();
    const caseMap = new Map(cases.map((c) => [c._id.toString(), c.title]));

    return docs.map((d) => toQuoteSummary(d, caseMap.get(d.caseId)));
  }

  async getQuote(id: string, organizationId: string): Promise<QuoteResponse> {
    const doc = await this.quoteModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Quote not found");
    const caseDoc = await this.caseModel
      .findOne({ _id: doc.caseId, ...activeDocumentFilter })
      .select("title")
      .exec();
    return toQuoteResponse(doc, caseDoc?.title);
  }

  async updateQuote(id: string, body: UpdateQuoteBody): Promise<QuoteResponse> {
    const update: Record<string, unknown> = {};
    if (body.subject !== undefined) update.subject = body.subject;
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.status !== undefined) update.status = body.status;
    if (body.validUntil !== undefined) {
      update.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    }
    if (body.lines !== undefined) {
      update.lines = body.lines.map((l) => ({
        articleId: l.articleId,
        prestationId: l.prestationId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        tvaRate: l.tvaRate,
        unit: l.unit,
      }));
    }

    const doc = await this.quoteModel
      .findOneAndUpdate(
        { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
        { $set: update },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Quote not found");
    const caseDoc = await this.caseModel
      .findOne({ _id: doc.caseId, ...activeDocumentFilter })
      .select("title")
      .exec();
    return toQuoteResponse(doc, caseDoc?.title);
  }

  async deleteQuote(id: string, organizationId: string): Promise<{ deleted: true }> {
    const doc = await this.quoteModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Quote not found");
    if (doc.status !== "draft") {
      throw new BadRequestException("Only draft quotes can be deleted");
    }
    const result = await this.quoteModel
      .updateOne(
        { _id: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
    if (!result.matchedCount) throw new NotFoundException("Quote not found");
    return { deleted: true };
  }

  /** Prochain numéro DEV-YYYY-NNNN pour l’org (basé sur le max existant, y compris soft-deleted). */
  private async generateQuoteNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DEV-${year}-`;
    const latest = await this.quoteModel
      .findOne({ organizationId, quoteNumber: { $regex: `^${prefix}` } })
      .sort({ quoteNumber: -1 })
      .select("quoteNumber")
      .lean()
      .exec();

    let next = 1;
    const current = latest?.quoteNumber;
    if (typeof current === "string" && current.startsWith(prefix)) {
      const parsed = Number.parseInt(current.slice(prefix.length), 10);
      if (Number.isFinite(parsed) && parsed >= next) next = parsed + 1;
    }
    return `${prefix}${String(next).padStart(4, "0")}`;
  }
}
