import { Body, Controller, Post } from "@nestjs/common";
import type {
  DataImportDeleteCreatedBody,
  ImportCustomersBody,
  ImportCustomerSitesBody,
  ImportOrderGiversBody,
} from "@planwise/shared";
import { AbstractCustomersDataImportService } from "../../domain/ports/customers-data-import.service.port";

@Controller("import")
export class CustomersDataImportController {
  constructor(private readonly importService: AbstractCustomersDataImportService) {}

  @Post("customers")
  importCustomers(@Body() body: ImportCustomersBody) {
    return this.importService.importCustomers(body);
  }

  @Post("customer-sites")
  importCustomerSites(@Body() body: ImportCustomerSitesBody) {
    return this.importService.importCustomerSites(body);
  }

  @Post("order-givers")
  importOrderGivers(@Body() body: ImportOrderGiversBody) {
    return this.importService.importOrderGivers(body);
  }

  @Post("resolve/customers")
  resolveCustomers(@Body() body: { organizationId: string; externalIds: string[] }) {
    return this.importService.resolveCustomerIds(body.organizationId, body.externalIds ?? []);
  }

  @Post("resolve/customer-sites")
  resolveSites(@Body() body: { organizationId: string; externalIds: string[] }) {
    return this.importService.resolveSiteIds(body.organizationId, body.externalIds ?? []);
  }

  @Post("resolve/order-givers")
  resolveOrderGivers(@Body() body: { organizationId: string; externalIds: string[] }) {
    return this.importService.resolveOrderGiverIds(body.organizationId, body.externalIds ?? []);
  }

  @Post("delete-created")
  deleteCreated(@Body() body: DataImportDeleteCreatedBody) {
    return this.importService.deleteCreated(body);
  }
}
