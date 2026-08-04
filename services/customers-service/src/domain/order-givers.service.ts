import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  clampPagination,
  organizationScopeFilter,
  type CreateOrderGiverBody,
  type OrderGiverResponse,
  type OrderGiversListResponse,
  type UpdateOrderGiverBody,
} from "@planwise/shared";
import {
  assertOrganizationScopedListNest,
  assertOrganizationScopedResourceNest,
  parseOrganizationIdBody,
} from "@planwise/shared/nest";
import type { OrderGiverDocument } from "../persistence/order-giver.schema";
import { AbstractOrderGiversService } from "./ports/order-givers.service.port";

@Injectable()
export class OrderGiversService extends AbstractOrderGiversService {
  constructor(
    @InjectModel("OrderGiver")
    private readonly orderGiverModel: Model<OrderGiverDocument>,
  ) {
    super();
  }

  async createOrderGiver(body: CreateOrderGiverBody): Promise<OrderGiverResponse> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    this.validateCreateOrderGiver(body);
    const doc = await this.orderGiverModel.create({
      organizationId,
      kind: body.kind,
      firstName: body.firstName?.trim() || undefined,
      lastName: body.lastName?.trim() || undefined,
      companyName: body.companyName?.trim() || undefined,
      legalIdentifier: body.legalIdentifier?.trim() || undefined,
      email: body.email?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      mobile: body.mobile?.trim() || undefined,
      address: body.address
        ? {
            line1: body.address.line1.trim(),
            line2: body.address.line2?.trim() || undefined,
            postalCode: body.address.postalCode.trim(),
            city: body.address.city.trim(),
            country: (body.address.country ?? "FR").trim() || "FR",
          }
        : undefined,
      notes: body.notes?.trim() || undefined,
      isTestData: body.isTestData === true,
    });
    return this.toOrderGiverResponse(doc);
  }

  async listOrderGivers(
    organizationId: string,
    filters?: { search?: string; ids?: string[]; limit?: number; offset?: number },
  ): Promise<OrderGiversListResponse> {
    const query: Record<string, unknown> = { ...organizationScopeFilter(organizationId) };

    const ids = filters?.ids?.length
      ? [...new Set(filters.ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100)
      : [];
    if (ids.length > 0) {
      query._id = { $in: ids };
    }

    const q = filters?.search?.trim();
    if (q && ids.length === 0) {
      query.$or = [
        { companyName: { $regex: q, $options: "i" } },
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { legalIdentifier: { $regex: q, $options: "i" } },
      ];
    }

    if (ids.length > 0) {
      const docs = await this.orderGiverModel
        .find(query)
        .sort({ updatedAt: -1 })
        .limit(ids.length)
        .exec();
      const orderGivers = assertOrganizationScopedListNest(
        organizationId,
        docs.map((d) => this.toOrderGiverResponse(d)),
      );
      return { orderGivers, total: orderGivers.length };
    }

    const { limit, offset } = clampPagination({
      limit: filters?.limit,
      offset: filters?.offset,
    });

    const [total, docs] = await Promise.all([
      this.orderGiverModel.countDocuments(query).exec(),
      this.orderGiverModel.find(query).sort({ updatedAt: -1 }).skip(offset).limit(limit).exec(),
    ]);

    const orderGivers = assertOrganizationScopedListNest(
      organizationId,
      docs.map((d) => this.toOrderGiverResponse(d)),
    );
    return { orderGivers, total };
  }

  async getOrderGiver(id: string, organizationId: string): Promise<OrderGiverResponse> {
    const doc = await this.orderGiverModel
      .findOne({ _id: id, ...organizationScopeFilter(organizationId) })
      .exec();
    if (!doc) throw new NotFoundException("Donneur d'ordre introuvable");
    return assertOrganizationScopedResourceNest(
      organizationId,
      this.toOrderGiverResponse(doc),
      "Donneur d'ordre introuvable",
    );
  }

  async updateOrderGiver(id: string, body: UpdateOrderGiverBody): Promise<OrderGiverResponse> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const setUpdate: Record<string, unknown> = {};
    if (body.kind !== undefined) setUpdate.kind = body.kind;
    if (body.firstName !== undefined) setUpdate.firstName = body.firstName?.trim() || null;
    if (body.lastName !== undefined) setUpdate.lastName = body.lastName?.trim() || null;
    if (body.companyName !== undefined) setUpdate.companyName = body.companyName?.trim() || null;
    if (body.legalIdentifier !== undefined) {
      setUpdate.legalIdentifier =
        body.legalIdentifier === null ? null : body.legalIdentifier.trim() || null;
    }
    if (body.email !== undefined)
      setUpdate.email = body.email === null ? null : body.email.trim() || null;
    if (body.phone !== undefined)
      setUpdate.phone = body.phone === null ? null : body.phone.trim() || null;
    if (body.mobile !== undefined)
      setUpdate.mobile = body.mobile === null ? null : body.mobile.trim() || null;
    if (body.notes !== undefined)
      setUpdate.notes = body.notes === null ? null : body.notes.trim() || null;
    if (body.address !== undefined) {
      setUpdate.address =
        body.address === null
          ? null
          : {
              line1: body.address.line1.trim(),
              line2: body.address.line2?.trim() || undefined,
              postalCode: body.address.postalCode.trim(),
              city: body.address.city.trim(),
              country: (body.address.country ?? "FR").trim() || "FR",
            };
    }

    const doc = await this.orderGiverModel
      .findOneAndUpdate(
        { _id: id, ...organizationScopeFilter(organizationId) },
        { $set: setUpdate },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Donneur d'ordre introuvable");

    this.validateOrderGiverDoc(doc);
    return assertOrganizationScopedResourceNest(
      organizationId,
      this.toOrderGiverResponse(doc),
      "Donneur d'ordre introuvable",
    );
  }

  async deleteOrderGiver(id: string, organizationId: string): Promise<{ deleted: true }> {
    const res = await this.orderGiverModel
      .findOneAndUpdate(
        { _id: id, ...organizationScopeFilter(organizationId) },
        { $set: { deletedAt: new Date() } },
        { new: true },
      )
      .exec();
    if (!res) throw new NotFoundException("Donneur d'ordre introuvable");
    return { deleted: true };
  }

  async purgeTestData(organizationId: string): Promise<{ purged: true }> {
    await this.orderGiverModel.deleteMany({ organizationId, isTestData: true }).exec();
    return { purged: true };
  }

  private validateCreateOrderGiver(body: CreateOrderGiverBody): void {
    if (body.kind === "company") {
      if (!body.companyName?.trim()) {
        throw new BadRequestException("La raison sociale est obligatoire pour une personne morale");
      }
    } else if (body.kind === "individual") {
      if (!body.firstName?.trim() && !body.lastName?.trim()) {
        throw new BadRequestException(
          "Le prénom ou le nom est obligatoire pour une personne physique",
        );
      }
    }
    if (body.address) {
      this.validateAddress(body.address);
    }
  }

  private validateAddress(address: { line1?: string; postalCode?: string; city?: string }): void {
    if (!address.line1?.trim() || !address.postalCode?.trim() || !address.city?.trim()) {
      throw new BadRequestException("Adresse incomplète (ligne 1, code postal et ville requis)");
    }
  }

  private validateOrderGiverDoc(doc: OrderGiverDocument): void {
    if (doc.kind === "company" && !doc.companyName?.trim()) {
      throw new BadRequestException("La raison sociale est obligatoire pour une personne morale");
    }
    if (doc.kind === "individual" && !doc.firstName?.trim() && !doc.lastName?.trim()) {
      throw new BadRequestException(
        "Le prénom ou le nom est obligatoire pour une personne physique",
      );
    }
  }

  private orderGiverDisplayName(doc: OrderGiverDocument): string {
    if (doc.kind === "company") {
      return doc.companyName?.trim() || "Société";
    }
    const parts = [doc.firstName, doc.lastName].filter((p) => p?.trim()).map((p) => p!.trim());
    return parts.length > 0 ? parts.join(" ") : "Donneur d'ordre";
  }

  private toOrderGiverResponse(doc: OrderGiverDocument): OrderGiverResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      kind: doc.kind,
      displayName: this.orderGiverDisplayName(doc),
      firstName: doc.firstName,
      lastName: doc.lastName,
      companyName: doc.companyName,
      legalIdentifier: doc.legalIdentifier,
      email: doc.email,
      phone: doc.phone,
      mobile: doc.mobile,
      address: doc.address
        ? {
            line1: doc.address.line1,
            line2: doc.address.line2,
            postalCode: doc.address.postalCode,
            city: doc.address.city,
            country: doc.address.country ?? "FR",
          }
        : undefined,
      notes: doc.notes,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
    };
  }
}
