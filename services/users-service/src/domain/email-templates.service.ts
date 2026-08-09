import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import type {
  CreatePlatformEmailTemplateBody,
  PlatformEmailTemplate,
  PlatformEmailTemplatePurpose,
  PlatformEmailTemplatesListResponse,
  UpdatePlatformEmailTemplateBody,
} from "@planwise/shared";
import { isPlatformEmailTemplatePurpose } from "@planwise/shared";
import { AbstractEmailTemplatesService } from "./ports/email-templates.service.port";
import { EmailTemplateDocument } from "../persistence/email-template.schema";
import { toPlatformEmailTemplate } from "./mappers/email-template.mapper";

function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(
    err && typeof err === "object" && "code" in err && (err as { code?: number }).code === 11000,
  );
}

@Injectable()
export class EmailTemplatesService extends AbstractEmailTemplatesService {
  constructor(
    @InjectModel("EmailTemplate")
    private readonly emailTemplateModel: Model<EmailTemplateDocument>,
  ) {
    super();
  }

  async list(options?: {
    purpose?: PlatformEmailTemplatePurpose;
  }): Promise<PlatformEmailTemplatesListResponse> {
    const filter = options?.purpose ? { purpose: options.purpose } : {};
    const docs = await this.emailTemplateModel.find(filter).sort({ isDefault: -1, name: 1 }).exec();
    return {
      templates: docs.map(toPlatformEmailTemplate),
      total: docs.length,
    };
  }

  async getById(id: string): Promise<PlatformEmailTemplate> {
    const doc = await this.findByIdOrThrow(id);
    return toPlatformEmailTemplate(doc);
  }

  async create(body: CreatePlatformEmailTemplateBody): Promise<PlatformEmailTemplate> {
    const name = body.name?.trim() ?? "";
    if (!name) throw new BadRequestException("Nom requis");
    if (!isPlatformEmailTemplatePurpose(body.purpose)) {
      throw new BadRequestException("Purpose invalide");
    }
    const subject = body.subject?.trim() ?? "";
    const emailBody = body.body?.trim() ?? "";
    if (!subject || !emailBody) {
      throw new BadRequestException("Sujet et corps requis");
    }

    const makeDefault = body.isDefault === true;
    if (makeDefault) {
      await this.clearDefault(body.purpose);
    } else {
      const hasDefault = await this.emailTemplateModel.exists({
        purpose: body.purpose,
        isDefault: true,
      });
      if (!hasDefault) {
        // Premier contenu d’un purpose = défaut automatique
        body = { ...body, isDefault: true };
      }
    }

    try {
      const doc = await this.emailTemplateModel.create({
        name,
        purpose: body.purpose,
        subject,
        body: emailBody,
        footer: body.footer?.trim() ?? "",
        ctaLabel: body.ctaLabel?.trim() || "Découvrir Planwise",
        ctaUrl: body.ctaUrl?.trim() || "/",
        isDefault: body.isDefault === true,
      });
      return toPlatformEmailTemplate(doc);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException("Un contenu avec ce nom existe déjà pour ce type");
      }
      throw err;
    }
  }

  async update(id: string, body: UpdatePlatformEmailTemplateBody): Promise<PlatformEmailTemplate> {
    const doc = await this.findByIdOrThrow(id);

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException("Nom requis");
      doc.name = name;
    }
    if (body.subject !== undefined) {
      const subject = body.subject.trim();
      if (!subject) throw new BadRequestException("Sujet requis");
      doc.subject = subject;
    }
    if (body.body !== undefined) {
      const emailBody = body.body.trim();
      if (!emailBody) throw new BadRequestException("Corps requis");
      doc.body = emailBody;
    }
    if (body.footer !== undefined) doc.footer = body.footer.trim();
    if (body.ctaLabel !== undefined) {
      doc.ctaLabel = body.ctaLabel.trim() || "Découvrir Planwise";
    }
    if (body.ctaUrl !== undefined) {
      doc.ctaUrl = body.ctaUrl.trim() || "/";
    }

    if (body.isDefault === true) {
      await this.clearDefault(doc.purpose, doc._id.toString());
      doc.isDefault = true;
    } else if (body.isDefault === false && doc.isDefault) {
      throw new BadRequestException(
        "Impossible de retirer le statut par défaut : désignez un autre contenu comme défaut",
      );
    }

    try {
      await doc.save();
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException("Un contenu avec ce nom existe déjà pour ce type");
      }
      throw err;
    }
    return toPlatformEmailTemplate(doc);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const doc = await this.findByIdOrThrow(id);
    if (doc.isDefault) {
      const others = await this.emailTemplateModel.countDocuments({
        purpose: doc.purpose,
        _id: { $ne: doc._id },
      });
      if (others === 0) {
        throw new BadRequestException("Impossible de supprimer le seul contenu de ce type");
      }
      throw new BadRequestException(
        "Impossible de supprimer le contenu par défaut : désignez un autre défaut d’abord",
      );
    }
    await doc.deleteOne();
    return { ok: true };
  }

  async setDefault(id: string): Promise<PlatformEmailTemplate> {
    const doc = await this.findByIdOrThrow(id);
    await this.clearDefault(doc.purpose, doc._id.toString());
    doc.isDefault = true;
    await doc.save();
    return toPlatformEmailTemplate(doc);
  }

  private async clearDefault(purpose: PlatformEmailTemplatePurpose, exceptId?: string) {
    const filter: Record<string, unknown> = { purpose, isDefault: true };
    if (exceptId && Types.ObjectId.isValid(exceptId)) {
      filter._id = { $ne: new Types.ObjectId(exceptId) };
    }
    await this.emailTemplateModel.updateMany(filter, { $set: { isDefault: false } }).exec();
  }

  private async findByIdOrThrow(id: string): Promise<EmailTemplateDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Contenu e-mail introuvable");
    }
    const doc = await this.emailTemplateModel.findById(id).exec();
    if (!doc) throw new NotFoundException("Contenu e-mail introuvable");
    return doc;
  }
}
