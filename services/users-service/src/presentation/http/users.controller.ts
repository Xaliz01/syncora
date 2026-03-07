import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../../domain/users.service";
import type {
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
