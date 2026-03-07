import { Body, Controller, Get, Param, Post, NotFoundException } from "@nestjs/common";
import { OrganizationsService } from "../../domain/organizations.service";
import type { CreateOrganizationBody } from "@syncora/shared";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

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
}
