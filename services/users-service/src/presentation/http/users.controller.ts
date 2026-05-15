import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { AbstractUsersService } from "../../domain/ports/users.service.port";
import type {
  ActivateInvitedUserBody,
  CreateInvitedUserBody,
  CreateOrganizationMembershipBody,
  CreateUserBody,
  PatchUserBody,
  ValidateCredentialsBody,
  ValidateCredentialsResponse,
} from "@syncora/shared";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: AbstractUsersService) {}

  @Post()
  async create(@Body() body: CreateUserBody) {
    return this.usersService.create(body);
  }

  @Post("invite")
  async invite(@Body() body: CreateInvitedUserBody) {
    return this.usersService.invite(body);
  }

  @Post("validate-credentials")
  async validateCredentials(
    @Body() body: ValidateCredentialsBody,
  ): Promise<ValidateCredentialsResponse> {
    const result = await this.usersService.validateCredentials(body.email, body.password);
    if (!result) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return result;
  }

  @Get()
  async listByOrganization(@Query("organizationId") organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.usersService.listByOrganization(organizationId);
  }

  @Get(":userId/organization-memberships")
  listOrganizationMemberships(@Param("userId") userId: string) {
    return this.usersService.listOrganizationMemberships(userId);
  }

  @Post(":userId/organization-memberships")
  addOrganizationMembership(
    @Param("userId") userId: string,
    @Body() body: CreateOrganizationMembershipBody,
  ) {
    return this.usersService.addOrganizationMembership(userId, body);
  }

  @Post(":id/activate")
  async activateInvitedUser(@Param("id") id: string, @Body() body: ActivateInvitedUserBody) {
    return this.usersService.activateInvitedUser(id, body);
  }

  @Patch(":id")
  async patch(@Param("id") id: string, @Body() body: PatchUserBody) {
    return this.usersService.patch(id, body);
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}
