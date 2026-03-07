import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UnauthorizedException
} from "@nestjs/common";
import { UsersService } from "../../domain/users.service";
import type {
  ActivateInvitedUserBody,
  CreateInvitedUserBody,
  CreateUserBody,
  ValidateCredentialsBody,
  ValidateCredentialsResponse
} from "@syncora/shared";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() body: CreateUserBody) {
    return this.usersService.create(body);
  }

  @Post("invite")
  async invite(@Body() body: CreateInvitedUserBody) {
    return this.usersService.invite(body);
  }

  @Post(":id/activate")
  async activateInvitedUser(
    @Param("id") id: string,
    @Body() body: ActivateInvitedUserBody
  ) {
    return this.usersService.activateInvitedUser(id, body);
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  @Get()
  async listByOrganization(@Query("organizationId") organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.usersService.listByOrganization(organizationId);
  }

  @Post("validate-credentials")
  async validateCredentials(
    @Body() body: ValidateCredentialsBody
  ): Promise<ValidateCredentialsResponse> {
    const result = await this.usersService.validateCredentials(
      body.email,
      body.password
    );
    if (!result) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return result;
  }
}
