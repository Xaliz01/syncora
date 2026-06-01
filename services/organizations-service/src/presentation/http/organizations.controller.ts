import { Body, Controller, Get, Param, Patch, Post, NotFoundException } from "@nestjs/common";
import { AbstractOrganizationsService } from "../../domain/ports/organizations.service.port";
import type {
  CreateOrganizationBody,
  TrialTestDataStatusResponse,
  UpdateOrganizationBody,
  UpdateOrganizationTrialTestDataBody,
} from "@syncora/shared";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: AbstractOrganizationsService) {}

  @Post()
  async create(@Body() body: CreateOrganizationBody) {
    return this.organizationsService.create(body.name);
  }

  @Get("trial-test-data/ready-organization-ids")
  listReadyTrialTestDataOrganizationIds(): Promise<string[]> {
    return this.organizationsService.listOrganizationsWithReadyTrialTestData();
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    const org = await this.organizationsService.findById(id);
    if (!org) throw new NotFoundException("Organization not found");
    return org;
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: UpdateOrganizationBody) {
    const org = await this.organizationsService.update(id, body);
    if (!org) throw new NotFoundException("Organization not found");
    return org;
  }

  @Get(":id/trial-test-data/status")
  getTrialTestDataStatus(@Param("id") id: string): Promise<TrialTestDataStatusResponse> {
    return this.organizationsService.getTrialTestDataStatus(id);
  }

  @Patch(":id/trial-test-data")
  updateTrialTestData(
    @Param("id") id: string,
    @Body() body: UpdateOrganizationTrialTestDataBody,
  ): Promise<TrialTestDataStatusResponse> {
    return this.organizationsService.updateTrialTestData(id, body);
  }
}
