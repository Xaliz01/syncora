import { Module } from "@nestjs/common";
import { AccountController } from "../presentation/http/account.controller";
import { AbstractAccountService } from "../domain/ports/account.service.port";
import { AccountService } from "../domain/account.service";
import { UsersModule } from "./users.module";
import { TechniciansDomainModule } from "./technicians-domain.module";

@Module({
  imports: [UsersModule, TechniciansDomainModule],
  controllers: [AccountController],
  providers: [{ provide: AbstractAccountService, useClass: AccountService }],
})
export class AccountModule {}
