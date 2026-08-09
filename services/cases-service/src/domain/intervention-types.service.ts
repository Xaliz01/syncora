import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  activeDocumentFilter,
  type CreateInterventionTypeBody,
  type InterventionTypeResponse,
  type InterventionTypesListResponse,
  type UpdateInterventionTypeBody,
} from "@planwise/shared";
import {
  assertOrganizationScopedListNest,
  assertOrganizationScopedResourceNest,
} from "@planwise/shared/nest";
import type { InterventionTypeDocument } from "../persistence/intervention-type.schema";
import { AbstractInterventionTypesService } from "./ports/intervention-types.service.port";
import { toInterventionTypeResponse } from "./mappers/intervention-type.mapper";
import { isDuplicateKeyError } from "./utils";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function normalizeColor(value: string | null | undefined): string | undefined | null {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!HEX_COLOR.test(trimmed)) {
    throw new BadRequestException("Couleur invalide (attendu #RRGGBB)");
  }
  return trimmed.toLowerCase();
}

@Injectable()
export class InterventionTypesService extends AbstractInterventionTypesService {
  constructor(
    @InjectModel("InterventionType")
    private readonly typeModel: Model<InterventionTypeDocument>,
  ) {
    super();
  }

  async create(body: CreateInterventionTypeBody): Promise<InterventionTypeResponse> {
    const name = body.name?.trim() ?? "";
    if (!name) throw new BadRequestException("Nom requis");
    const color = normalizeColor(body.color);
    try {
      const doc = await this.typeModel.create({
        organizationId: body.organizationId,
        name,
        description: body.description?.trim() || undefined,
        ...(color ? { color } : {}),
        isTestData: body.isTestData === true,
      });
      return assertOrganizationScopedResourceNest(
        body.organizationId,
        toInterventionTypeResponse(doc),
      );
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException("Un type avec ce nom existe déjà");
      }
      throw err;
    }
  }

  async list(organizationId: string): Promise<InterventionTypesListResponse> {
    const docs = await this.typeModel
      .find({ organizationId, ...activeDocumentFilter })
      .sort({ name: 1 })
      .exec();
    const types = assertOrganizationScopedListNest(
      organizationId,
      docs.map((d) => toInterventionTypeResponse(d)),
    );
    return { types, total: types.length };
  }

  async getById(id: string, organizationId: string): Promise<InterventionTypeResponse> {
    const doc = await this.typeModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Type d’intervention introuvable");
    return assertOrganizationScopedResourceNest(organizationId, toInterventionTypeResponse(doc));
  }

  async update(id: string, body: UpdateInterventionTypeBody): Promise<InterventionTypeResponse> {
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException("Nom requis");
      update.name = name;
    }
    if (body.description !== undefined) {
      update.description = body.description === null ? null : body.description.trim() || null;
    }
    if (body.color !== undefined) {
      const color = normalizeColor(body.color);
      update.color = color === undefined ? null : color;
    }
    try {
      const doc = await this.typeModel
        .findOneAndUpdate(
          { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
          { $set: update },
          { new: true },
        )
        .exec();
      if (!doc) throw new NotFoundException("Type d’intervention introuvable");
      return assertOrganizationScopedResourceNest(
        body.organizationId,
        toInterventionTypeResponse(doc),
      );
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException("Un type avec ce nom existe déjà");
      }
      throw err;
    }
  }

  async remove(id: string, organizationId: string): Promise<{ deleted: true }> {
    const result = await this.typeModel
      .updateOne(
        { _id: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
    if (!result.matchedCount) throw new NotFoundException("Type d’intervention introuvable");
    return { deleted: true };
  }
}
