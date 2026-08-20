import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  activeDocumentFilter,
  postalAddressFromImportRow,
  type DataImportBulkResult,
  type DataImportDeleteCreatedBody,
  type DataImportDeleteCreatedResult,
  type DataImportResolvedCustomerRef,
  type DataImportRowError,
  type ImportCustomerRow,
  type ImportCustomersBody,
  type ImportCustomerSitesBody,
  type ImportOrderGiverRow,
  type ImportOrderGiversBody,
} from "@planwise/shared";
import { parseOrganizationIdBody } from "@planwise/shared/nest";
import type { CustomerDocument } from "../persistence/customer.schema";
import type { OrderGiverDocument } from "../persistence/order-giver.schema";
import { customerDisplayName } from "./mappers/customer.mapper";
import { AbstractCustomersDataImportService } from "./ports/customers-data-import.service.port";

function emptyResult(): DataImportBulkResult {
  return { created: 0, updated: 0, skipped: 0, errors: [], mappings: [] };
}

function validatePersonRow(
  row: ImportCustomerRow | ImportOrderGiverRow,
  rowIndex: number,
): DataImportRowError | null {
  if (!row.externalId?.trim()) {
    return { row: rowIndex, field: "externalId", message: "externalId requis", severity: "error" };
  }
  if (row.kind !== "individual" && row.kind !== "company") {
    return {
      row: rowIndex,
      field: "kind",
      message: 'kind doit être "individual" ou "company"',
      severity: "error",
    };
  }
  if (row.kind === "company" && !row.companyName?.trim()) {
    return {
      row: rowIndex,
      field: "companyName",
      message: "companyName requis pour kind=company",
      severity: "error",
    };
  }
  if (row.kind === "individual" && !row.firstName?.trim() && !row.lastName?.trim()) {
    return {
      row: rowIndex,
      field: "firstName",
      message: "firstName ou lastName requis pour kind=individual",
      severity: "error",
    };
  }
  return null;
}

function personFieldsFromRow(row: ImportCustomerRow | ImportOrderGiverRow) {
  return {
    kind: row.kind,
    firstName: row.firstName?.trim() || undefined,
    lastName: row.lastName?.trim() || undefined,
    companyName: row.companyName?.trim() || undefined,
    legalIdentifier: row.legalIdentifier?.trim() || undefined,
    email: row.email?.trim() || undefined,
    phone: row.phone?.trim() || undefined,
    mobile: row.mobile?.trim() || undefined,
    address: postalAddressFromImportRow(row),
    notes: row.notes?.trim() || undefined,
    importExternalId: row.externalId.trim(),
  };
}

@Injectable()
export class CustomersDataImportService extends AbstractCustomersDataImportService {
  constructor(
    @InjectModel("Customer")
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel("OrderGiver")
    private readonly orderGiverModel: Model<OrderGiverDocument>,
  ) {
    super();
  }

  async importCustomers(body: ImportCustomersBody): Promise<DataImportBulkResult> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const result = emptyResult();
    for (let i = 0; i < body.rows.length; i += 1) {
      const row = body.rows[i]!;
      const rowNum = i + 2; // header + 1-based
      const err = validatePersonRow(row, rowNum);
      if (err) {
        result.errors.push(err);
        result.skipped += 1;
        continue;
      }
      const externalId = row.externalId.trim();
      try {
        const existing = await this.customerModel
          .findOne({ organizationId, importExternalId: externalId, ...activeDocumentFilter })
          .exec();
        const fields = personFieldsFromRow(row);
        if (existing) {
          Object.assign(existing, fields);
          await existing.save();
          result.updated += 1;
          result.mappings.push({ externalId, id: existing._id.toString(), action: "updated" });
        } else {
          const doc = await this.customerModel.create({
            organizationId,
            ...fields,
            sites: [],
            contacts: [],
          });
          result.created += 1;
          result.mappings.push({ externalId, id: doc._id.toString(), action: "created" });
        }
      } catch (e) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          message: e instanceof Error ? e.message : "Erreur import client",
          severity: "error",
        });
      }
    }
    return result;
  }

  async importCustomerSites(body: ImportCustomerSitesBody): Promise<DataImportBulkResult> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const result = emptyResult();
    for (let i = 0; i < body.rows.length; i += 1) {
      const row = body.rows[i]!;
      const rowNum = i + 2;
      if (!row.externalId?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "externalId",
          message: "externalId requis",
          severity: "error",
        });
        continue;
      }
      if (!row.customerExternalId?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "customerExternalId",
          message: "customerExternalId requis",
          severity: "error",
        });
        continue;
      }
      if (!row.label?.trim()) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "label",
          message: "label requis",
          severity: "error",
        });
        continue;
      }
      const address = postalAddressFromImportRow(row);
      if (!address) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "addressLine1",
          message: "adresse complète requise (addressLine1, postalCode, city)",
          severity: "error",
        });
        continue;
      }
      const customerId = body.customerIdByExternalId[row.customerExternalId.trim()];
      if (!customerId) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          field: "customerExternalId",
          message: `Client inconnu : ${row.customerExternalId}`,
          severity: "error",
        });
        continue;
      }
      try {
        const customer = await this.customerModel
          .findOne({ _id: customerId, organizationId, ...activeDocumentFilter })
          .exec();
        if (!customer) {
          result.skipped += 1;
          result.errors.push({
            row: rowNum,
            message: `Client introuvable : ${customerId}`,
            severity: "error",
          });
          continue;
        }
        const externalId = row.externalId.trim();
        const existingSite = customer.sites.find((s) => s.importExternalId === externalId);
        if (existingSite) {
          existingSite.label = row.label.trim();
          existingSite.address = address;
          existingSite.isDefault = row.isDefault === true;
          existingSite.notes = row.notes?.trim() || undefined;
          await customer.save();
          result.updated += 1;
          result.mappings.push({ externalId, id: existingSite._id.toString(), action: "updated" });
        } else {
          const siteId = new Types.ObjectId();
          customer.sites.push({
            _id: siteId,
            label: row.label.trim(),
            address,
            isDefault: row.isDefault === true,
            notes: row.notes?.trim() || undefined,
            importExternalId: externalId,
          } as CustomerDocument["sites"][number]);
          await customer.save();
          result.created += 1;
          result.mappings.push({ externalId, id: siteId.toString(), action: "created" });
        }
      } catch (e) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          message: e instanceof Error ? e.message : "Erreur import site",
          severity: "error",
        });
      }
    }
    return result;
  }

  async importOrderGivers(body: ImportOrderGiversBody): Promise<DataImportBulkResult> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const result = emptyResult();
    for (let i = 0; i < body.rows.length; i += 1) {
      const row = body.rows[i]!;
      const rowNum = i + 2;
      const err = validatePersonRow(row, rowNum);
      if (err) {
        result.errors.push(err);
        result.skipped += 1;
        continue;
      }
      const externalId = row.externalId.trim();
      try {
        const existing = await this.orderGiverModel
          .findOne({ organizationId, importExternalId: externalId, ...activeDocumentFilter })
          .exec();
        const fields = personFieldsFromRow(row);
        if (existing) {
          Object.assign(existing, fields);
          await existing.save();
          result.updated += 1;
          result.mappings.push({ externalId, id: existing._id.toString(), action: "updated" });
        } else {
          const doc = await this.orderGiverModel.create({ organizationId, ...fields });
          result.created += 1;
          result.mappings.push({ externalId, id: doc._id.toString(), action: "created" });
        }
      } catch (e) {
        result.skipped += 1;
        result.errors.push({
          row: rowNum,
          message: e instanceof Error ? e.message : "Erreur import donneur d’ordre",
          severity: "error",
        });
      }
    }
    return result;
  }

  async resolveCustomerIds(
    organizationId: string,
    externalIds: string[],
  ): Promise<Record<string, DataImportResolvedCustomerRef>> {
    const orgId = parseOrganizationIdBody(organizationId);
    const ids = [...new Set(externalIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) return {};
    const docs = await this.customerModel
      .find({
        organizationId: orgId,
        importExternalId: { $in: ids },
        ...activeDocumentFilter,
      })
      .select("_id importExternalId kind companyName firstName lastName")
      .exec();
    const map: Record<string, DataImportResolvedCustomerRef> = {};
    for (const doc of docs) {
      if (doc.importExternalId) {
        map[doc.importExternalId] = {
          id: doc._id.toString(),
          displayName: customerDisplayName(doc),
        };
      }
    }
    return map;
  }

  async resolveSiteIds(
    organizationId: string,
    externalIds: string[],
  ): Promise<Record<string, string>> {
    const orgId = parseOrganizationIdBody(organizationId);
    const ids = [...new Set(externalIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) return {};
    const docs = await this.customerModel
      .find({
        organizationId: orgId,
        "sites.importExternalId": { $in: ids },
        ...activeDocumentFilter,
      })
      .select("sites")
      .exec();
    const map: Record<string, string> = {};
    for (const doc of docs) {
      for (const site of doc.sites) {
        if (site.importExternalId && ids.includes(site.importExternalId)) {
          map[site.importExternalId] = site._id.toString();
        }
      }
    }
    return map;
  }

  async resolveOrderGiverIds(
    organizationId: string,
    externalIds: string[],
  ): Promise<Record<string, string>> {
    const orgId = parseOrganizationIdBody(organizationId);
    const ids = [...new Set(externalIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) return {};
    const docs = await this.orderGiverModel
      .find({
        organizationId: orgId,
        importExternalId: { $in: ids },
        ...activeDocumentFilter,
      })
      .select("_id importExternalId")
      .exec();
    const map: Record<string, string> = {};
    for (const doc of docs) {
      if (doc.importExternalId) map[doc.importExternalId] = doc._id.toString();
    }
    return map;
  }

  async deleteCreated(body: DataImportDeleteCreatedBody): Promise<DataImportDeleteCreatedResult> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const objectIds = [
      ...new Set(
        (body.ids ?? [])
          .map((id) => id.trim())
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id)),
      ),
    ];
    if (objectIds.length === 0) return { deleted: 0 };

    let deleted = 0;
    const chunkSize = 500;
    for (let i = 0; i < objectIds.length; i += chunkSize) {
      const chunk = objectIds.slice(i, i + chunkSize);
      if (body.entity === "customers") {
        const res = await this.customerModel
          .deleteMany({ organizationId, _id: { $in: chunk } })
          .exec();
        deleted += res.deletedCount ?? 0;
      } else if (body.entity === "order_givers") {
        const res = await this.orderGiverModel
          .deleteMany({ organizationId, _id: { $in: chunk } })
          .exec();
        deleted += res.deletedCount ?? 0;
      } else if (body.entity === "customer_sites") {
        const customers = await this.customerModel
          .find({ organizationId, "sites._id": { $in: chunk } })
          .select("sites._id")
          .exec();
        const chunkSet = new Set(chunk.map((id) => id.toString()));
        let matched = 0;
        for (const customer of customers) {
          for (const site of customer.sites) {
            if (chunkSet.has(site._id.toString())) matched += 1;
          }
        }
        await this.customerModel
          .updateMany(
            { organizationId, "sites._id": { $in: chunk } },
            { $pull: { sites: { _id: { $in: chunk } } } },
          )
          .exec();
        deleted += matched;
      } else {
        throw new Error(`Entité non gérée par customers-service : ${body.entity}`);
      }
    }

    return { deleted };
  }
}
