import { Body, Controller, Get, Param, Patch, Post, NotFoundException } from "@nestjs/common";
import { AbstractOrganizationsService } from "../../domain/ports/organizations.service.port";
import type { CreateOrganizationBody, UpdateOrganizationBody } from "@syncora/shared";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: AbstractOrganizationsService) {}

  @Post()
  async create(@Body() body: CreateOrganizationBody) {
    return this.organizationsService.create(body.name);
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
}
