import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  assertOrganizationScopedListNest,
  assertOrganizationScopedResourceNest,
  organizationScopeFilter,
  parseOrganizationIdBody,
  type CreateCustomerBody,
  type CustomerResponse,
  type UpdateCustomerBody,
} from "@syncora/shared";
import type { CustomerDocument } from "../persistence/customer.schema";
import { AbstractCustomersService } from "./ports/customers.service.port";

@Injectable()
export class CustomersService extends AbstractCustomersService {
  constructor(
    @InjectModel("Customer")
    private readonly customerModel: Model<CustomerDocument>,
  ) {
    super();
  }

  async createCustomer(body: CreateCustomerBody): Promise<CustomerResponse> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    this.validateCreateCustomer(body);
    const doc = await this.customerModel.create({
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
    });
    return this.toCustomerResponse(doc);
  }

  async listCustomers(
    organizationId: string,
    filters?: { search?: string; ids?: string[] },
  ): Promise<CustomerResponse[]> {
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

    const docs = await this.customerModel
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(ids.length > 0 ? ids.length : 200)
      .exec();
    return assertOrganizationScopedListNest(
      organizationId,
      docs.map((d) => this.toCustomerResponse(d)),
    );
  }

  async getCustomer(id: string, organizationId: string): Promise<CustomerResponse> {
    const doc = await this.customerModel.findOne({ _id: id, ...organizationScopeFilter(organizationId) }).exec();
    if (!doc) throw new NotFoundException("Client introuvable");
    return assertOrganizationScopedResourceNest(
      organizationId,
      this.toCustomerResponse(doc),
      "Client introuvable",
    );
  }

  async updateCustomer(id: string, body: UpdateCustomerBody): Promise<CustomerResponse> {
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

    const doc = await this.customerModel
      .findOneAndUpdate(
        { _id: id, ...organizationScopeFilter(organizationId) },
        { $set: setUpdate },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Client introuvable");

    this.validateCustomerDoc(doc);
    return assertOrganizationScopedResourceNest(
      organizationId,
      this.toCustomerResponse(doc),
      "Client introuvable",
    );
  }

  async deleteCustomer(id: string, organizationId: string): Promise<{ deleted: true }> {
    const res = await this.customerModel
      .findOneAndUpdate(
        { _id: id, ...organizationScopeFilter(organizationId) },
        { $set: { deletedAt: new Date() } },
        { new: true },
      )
      .exec();
    if (!res) throw new NotFoundException("Client introuvable");
    return { deleted: true };
  }

  private validateCreateCustomer(body: CreateCustomerBody): void {
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
      const a = body.address;
      if (!a.line1?.trim() || !a.postalCode?.trim() || !a.city?.trim()) {
        throw new BadRequestException("Adresse incomplète (ligne 1, code postal et ville requis)");
      }
    }
  }

  private validateCustomerDoc(doc: CustomerDocument): void {
    if (doc.kind === "company" && !doc.companyName?.trim()) {
      throw new BadRequestException("La raison sociale est obligatoire pour une personne morale");
    }
    if (doc.kind === "individual" && !doc.firstName?.trim() && !doc.lastName?.trim()) {
      throw new BadRequestException(
        "Le prénom ou le nom est obligatoire pour une personne physique",
      );
    }
  }

  private customerDisplayName(doc: CustomerDocument): string {
    if (doc.kind === "company") {
      return doc.companyName?.trim() || "Société";
    }
    const parts = [doc.firstName, doc.lastName].filter((p) => p?.trim()).map((p) => p!.trim());
    return parts.length > 0 ? parts.join(" ") : "Client";
  }

  private toCustomerResponse(doc: CustomerDocument): CustomerResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      kind: doc.kind,
      displayName: this.customerDisplayName(doc),
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
    };
  }
}
