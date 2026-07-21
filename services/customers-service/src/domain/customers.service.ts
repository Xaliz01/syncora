import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  clampPagination,
  organizationScopeFilter,
  type CreateCustomerBody,
  type CreateCustomerContactBody,
  type CreateCustomerSiteBody,
  type CustomerContactResponse,
  type CustomerResponse,
  type CustomerSiteResponse,
  type CustomersListResponse,
  type UpdateCustomerBody,
  type UpdateCustomerContactBody,
  type UpdateCustomerSiteBody,
} from "@planwise/shared";
import {
  assertOrganizationScopedListNest,
  assertOrganizationScopedResourceNest,
  parseOrganizationIdBody,
} from "@planwise/shared/nest";
import type {
  CustomerContactSubDoc,
  CustomerDocument,
  CustomerSiteSubDoc,
} from "../persistence/customer.schema";
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
      isTestData: body.isTestData === true,
    });
    return this.toCustomerResponse(doc);
  }

  async listCustomers(
    organizationId: string,
    filters?: { search?: string; ids?: string[]; limit?: number; offset?: number },
  ): Promise<CustomersListResponse> {
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
      const docs = await this.customerModel
        .find(query)
        .sort({ updatedAt: -1 })
        .limit(ids.length)
        .exec();
      const customers = assertOrganizationScopedListNest(
        organizationId,
        docs.map((d) => this.toCustomerResponse(d)),
      );
      return { customers, total: customers.length };
    }

    const { limit, offset } = clampPagination({
      limit: filters?.limit,
      offset: filters?.offset,
    });

    const [total, docs] = await Promise.all([
      this.customerModel.countDocuments(query).exec(),
      this.customerModel.find(query).sort({ updatedAt: -1 }).skip(offset).limit(limit).exec(),
    ]);

    const customers = assertOrganizationScopedListNest(
      organizationId,
      docs.map((d) => this.toCustomerResponse(d)),
    );
    return { customers, total };
  }

  async getCustomer(id: string, organizationId: string): Promise<CustomerResponse> {
    const doc = await this.customerModel
      .findOne({ _id: id, ...organizationScopeFilter(organizationId) })
      .exec();
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

  async purgeTestData(organizationId: string): Promise<{ purged: true }> {
    await this.customerModel.deleteMany({ organizationId, isTestData: true }).exec();
    return { purged: true };
  }

  // ── Sites ──

  async createSite(
    customerId: string,
    body: CreateCustomerSiteBody,
  ): Promise<CustomerSiteResponse> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    this.validateSiteAddress(body.address);

    if (!body.label?.trim()) {
      throw new BadRequestException("Le libellé du site est obligatoire");
    }

    const update: Record<string, unknown> = {};
    const newSite = {
      label: body.label.trim(),
      address: {
        line1: body.address.line1.trim(),
        line2: body.address.line2?.trim() || undefined,
        postalCode: body.address.postalCode.trim(),
        city: body.address.city.trim(),
        country: (body.address.country ?? "FR").trim() || "FR",
      },
      isDefault: body.isDefault === true,
      notes: body.notes?.trim() || undefined,
    };

    if (body.isDefault) {
      update.$set = { "sites.$[].isDefault": false };
    }

    const doc = await this.customerModel
      .findOneAndUpdate(
        { _id: customerId, ...organizationScopeFilter(organizationId) },
        { ...update, $push: { sites: newSite } },
        { new: true },
      )
      .exec();

    if (!doc) throw new NotFoundException("Client introuvable");

    const createdSite = doc.sites[doc.sites.length - 1];
    return this.toSiteResponse(createdSite);
  }

  async updateSite(
    customerId: string,
    siteId: string,
    body: UpdateCustomerSiteBody,
  ): Promise<CustomerSiteResponse> {
    const organizationId = parseOrganizationIdBody(body.organizationId);

    const doc = await this.customerModel
      .findOne({ _id: customerId, ...organizationScopeFilter(organizationId) })
      .exec();
    if (!doc) throw new NotFoundException("Client introuvable");

    const site = doc.sites.find((s) => s._id.toString() === siteId);
    if (!site) throw new NotFoundException("Site introuvable");

    if (body.label !== undefined) {
      if (!body.label?.trim()) {
        throw new BadRequestException("Le libellé du site est obligatoire");
      }
      site.label = body.label.trim();
    }
    if (body.address !== undefined) {
      this.validateSiteAddress(body.address);
      site.address = {
        line1: body.address.line1.trim(),
        line2: body.address.line2?.trim() || undefined,
        postalCode: body.address.postalCode.trim(),
        city: body.address.city.trim(),
        country: (body.address.country ?? "FR").trim() || "FR",
      } as typeof site.address;
    }
    if (body.isDefault !== undefined) {
      if (body.isDefault) {
        doc.sites.forEach((s) => {
          s.isDefault = false;
        });
      }
      site.isDefault = body.isDefault;
    }
    if (body.notes !== undefined) {
      site.notes = body.notes === null ? undefined : body.notes?.trim() || undefined;
    }

    await doc.save();
    return this.toSiteResponse(site);
  }

  async deleteSite(
    customerId: string,
    siteId: string,
    organizationId: string,
  ): Promise<{ deleted: true }> {
    const doc = await this.customerModel
      .findOneAndUpdate(
        { _id: customerId, ...organizationScopeFilter(organizationId) },
        { $pull: { sites: { _id: siteId } } },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Client introuvable");
    return { deleted: true };
  }

  // ── Contacts ──

  async createContact(
    customerId: string,
    body: CreateCustomerContactBody,
  ): Promise<CustomerContactResponse> {
    const organizationId = parseOrganizationIdBody(body.organizationId);

    if (!body.name?.trim()) {
      throw new BadRequestException("Le nom du contact est obligatoire");
    }

    const newContact = {
      name: body.name.trim(),
      role: body.role?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      mobile: body.mobile?.trim() || undefined,
      email: body.email?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
    };

    const doc = await this.customerModel
      .findOneAndUpdate(
        { _id: customerId, ...organizationScopeFilter(organizationId) },
        { $push: { contacts: newContact } },
        { new: true },
      )
      .exec();

    if (!doc) throw new NotFoundException("Client introuvable");

    const created = doc.contacts[doc.contacts.length - 1];
    return this.toContactResponse(created);
  }

  async updateContact(
    customerId: string,
    contactId: string,
    body: UpdateCustomerContactBody,
  ): Promise<CustomerContactResponse> {
    const organizationId = parseOrganizationIdBody(body.organizationId);

    const doc = await this.customerModel
      .findOne({ _id: customerId, ...organizationScopeFilter(organizationId) })
      .exec();
    if (!doc) throw new NotFoundException("Client introuvable");

    const contact = doc.contacts.find((c) => c._id.toString() === contactId);
    if (!contact) throw new NotFoundException("Contact introuvable");

    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        throw new BadRequestException("Le nom du contact est obligatoire");
      }
      contact.name = body.name.trim();
    }
    if (body.role !== undefined) {
      contact.role = body.role === null ? undefined : body.role?.trim() || undefined;
    }
    if (body.phone !== undefined) {
      contact.phone = body.phone === null ? undefined : body.phone?.trim() || undefined;
    }
    if (body.mobile !== undefined) {
      contact.mobile = body.mobile === null ? undefined : body.mobile?.trim() || undefined;
    }
    if (body.email !== undefined) {
      contact.email = body.email === null ? undefined : body.email?.trim() || undefined;
    }
    if (body.notes !== undefined) {
      contact.notes = body.notes === null ? undefined : body.notes?.trim() || undefined;
    }

    await doc.save();
    return this.toContactResponse(contact);
  }

  async deleteContact(
    customerId: string,
    contactId: string,
    organizationId: string,
  ): Promise<{ deleted: true }> {
    const doc = await this.customerModel
      .findOneAndUpdate(
        { _id: customerId, ...organizationScopeFilter(organizationId) },
        { $pull: { contacts: { _id: contactId } } },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("Client introuvable");
    return { deleted: true };
  }

  // ── Validation ──

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
      this.validateSiteAddress(body.address);
    }
  }

  private validateSiteAddress(address: {
    line1?: string;
    postalCode?: string;
    city?: string;
  }): void {
    if (!address.line1?.trim() || !address.postalCode?.trim() || !address.city?.trim()) {
      throw new BadRequestException("Adresse incomplète (ligne 1, code postal et ville requis)");
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

  private toSiteResponse(site: CustomerSiteSubDoc): CustomerSiteResponse {
    return {
      id: site._id.toString(),
      label: site.label,
      address: {
        line1: site.address.line1,
        line2: site.address.line2,
        postalCode: site.address.postalCode,
        city: site.address.city,
        country: site.address.country ?? "FR",
      },
      isDefault: site.isDefault || undefined,
      notes: site.notes,
    };
  }

  private toContactResponse(contact: CustomerContactSubDoc): CustomerContactResponse {
    return {
      id: contact._id.toString(),
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
      mobile: contact.mobile,
      email: contact.email,
      notes: contact.notes,
    };
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
      sites: doc.sites?.length ? doc.sites.map((s) => this.toSiteResponse(s)) : undefined,
      contacts: doc.contacts?.length
        ? doc.contacts.map((c) => this.toContactResponse(c))
        : undefined,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
      isTestData: doc.isTestData === true,
    };
  }
}
