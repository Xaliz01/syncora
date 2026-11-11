import "reflect-metadata";
import { ForbiddenException } from "@nestjs/common";
import type { AuthUser, PermissionCode } from "@planwise/shared";
import { AgencesGatewayController } from "../../../presentation/http/agences.controller";
import { AdminController } from "../../../presentation/http/admin.controller";
import { BillingController } from "../../../presentation/http/billing.controller";
import { CasesController } from "../../../presentation/http/cases.controller";
import { CustomersController } from "../../../presentation/http/customers.controller";
import { FleetController } from "../../../presentation/http/fleet.controller";
import { OrderGiversController } from "../../../presentation/http/order-givers.controller";
import { OrganizationsController } from "../../../presentation/http/organizations.controller";
import { StockController } from "../../../presentation/http/stock.controller";
import { TeamsGatewayController } from "../../../presentation/http/teams.controller";
import { TechniciansController } from "../../../presentation/http/technicians.controller";
import {
  REQUIRED_ANY_PERMISSIONS_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from "../../../infrastructure/require-permission.guard";
import {
  DOCUMENT_PARENT_ACCESS,
  SEARCH_ENTITY_READ_RULES,
  assertDocumentParentAccess,
  resolveCallerPermissions,
} from "../caller-access";
import type { AbstractPermissionsService } from "../ports/permissions.service.port";

function required(handler: (...args: never[]) => unknown): PermissionCode[] {
  return Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler) ?? [];
}

function requiredAny(handler: (...args: never[]) => unknown): PermissionCode[] {
  return Reflect.getMetadata(REQUIRED_ANY_PERMISSIONS_KEY, handler) ?? [];
}

describe("caller access codes", () => {
  it("uses the same read codes as the entity list controllers", () => {
    expect(SEARCH_ENTITY_READ_RULES.case).toEqual({
      codes: required(CasesController.prototype.listCases),
      match: "all",
    });
    expect(SEARCH_ENTITY_READ_RULES.intervention).toEqual({
      codes: required(CasesController.prototype.listInterventions),
      match: "all",
    });
    expect(SEARCH_ENTITY_READ_RULES.customer).toEqual({
      codes: required(CustomersController.prototype.listCustomers),
      match: "all",
    });
    expect(SEARCH_ENTITY_READ_RULES.order_giver).toEqual({
      codes: required(OrderGiversController.prototype.listOrderGivers),
      match: "all",
    });
    expect(SEARCH_ENTITY_READ_RULES.vehicle).toEqual({
      codes: required(FleetController.prototype.listVehicles),
      match: "all",
    });
    expect(SEARCH_ENTITY_READ_RULES.technician).toEqual({
      codes: required(TechniciansController.prototype.listTechnicians),
      match: "all",
    });
    expect(SEARCH_ENTITY_READ_RULES.team).toEqual({
      codes: required(TeamsGatewayController.prototype.listTeams),
      match: "all",
    });
    expect(SEARCH_ENTITY_READ_RULES.agence).toEqual({
      codes: requiredAny(AgencesGatewayController.prototype.listAgences),
      match: "any",
    });
    expect(SEARCH_ENTITY_READ_RULES.article).toEqual({
      codes: required(StockController.prototype.listArticles),
      match: "all",
    });
    expect(SEARCH_ENTITY_READ_RULES.prestation).toEqual({
      codes: required(StockController.prototype.listPrestations),
      match: "all",
    });
    expect(SEARCH_ENTITY_READ_RULES.invoice).toEqual({
      codes: required(BillingController.prototype.listInvoices),
      match: "all",
    });
    expect(SEARCH_ENTITY_READ_RULES.user).toEqual({
      codes: required(AdminController.prototype.listOrganizationUsers),
      match: "all",
    });
  });

  it("uses the parent update permission as the document write permission", () => {
    expect(DOCUMENT_PARENT_ACCESS.case.write).toBe(
      required(CasesController.prototype.updateCase)[0],
    );
    expect(DOCUMENT_PARENT_ACCESS.intervention.write).toBe(
      required(CasesController.prototype.updateIntervention)[0],
    );
    expect(DOCUMENT_PARENT_ACCESS.customer.write).toBe(
      required(CustomersController.prototype.updateCustomer)[0],
    );
    expect(DOCUMENT_PARENT_ACCESS.vehicle.write).toBe(
      required(FleetController.prototype.updateVehicle)[0],
    );
    expect(DOCUMENT_PARENT_ACCESS.technician.write).toBe(
      required(TechniciansController.prototype.updateTechnician)[0],
    );
    expect(DOCUMENT_PARENT_ACCESS.team.write).toBe(
      required(TeamsGatewayController.prototype.updateTeam)[0],
    );
    expect(DOCUMENT_PARENT_ACCESS.organization.write).toBe(
      required(OrganizationsController.prototype.updateMine)[0],
    );
    expect(DOCUMENT_PARENT_ACCESS.case.read).toBe(SEARCH_ENTITY_READ_RULES.case.codes[0]);
    expect(DOCUMENT_PARENT_ACCESS.organization.read).toBe(
      required(OrganizationsController.prototype.getMine)[0],
    );
  });

  it("rejects a member who does not hold the parent read permission", () => {
    expect(() => assertDocumentParentAccess(new Set(["customers.read"]), "case", "read")).toThrow(
      ForbiddenException,
    );
  });
});

describe("resolveCallerPermissions", () => {
  const member: AuthUser = {
    id: "member-1",
    email: "membre@test.fr",
    organizationId: "org-1",
    role: "member",
    status: "active",
    permissions: ["customers.read", "billing.invoices.read"],
    name: "Membre",
  };

  function permissionsPort(live: PermissionCode[] | Error): AbstractPermissionsService {
    return {
      resolveEffectivePermissions: jest.fn(async () => {
        if (live instanceof Error) throw live;
        return { permissions: live };
      }),
    } as unknown as AbstractPermissionsService;
  }

  it("intersects the token with the permissions module for a member", async () => {
    const granted = await resolveCallerPermissions(permissionsPort(["customers.read"]), member);

    expect([...granted]).toEqual(["customers.read"]);
  });

  it("grants every assignable permission to an organization admin", async () => {
    const port = permissionsPort([]);
    const granted = await resolveCallerPermissions(port, {
      ...member,
      role: "admin",
      permissions: [],
    });

    expect(granted.has("billing.invoices.read")).toBe(true);
    expect(granted.has("cases.update")).toBe(true);
    expect(port.resolveEffectivePermissions).not.toHaveBeenCalled();
  });

  it("falls back to the token when the permissions module fails", async () => {
    const granted = await resolveCallerPermissions(permissionsPort(new Error("down")), member);

    expect(granted.has("billing.invoices.read")).toBe(true);
    expect(granted.has("customers.read")).toBe(true);
  });
});
