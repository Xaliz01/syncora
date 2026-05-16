import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AccountController } from "../presentation/http/account.controller";
import { AbstractAccountService } from "../domain/ports/account.service.port";
import { AccountService } from "../domain/account.service";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [AccountController],
  providers: [{ provide: AbstractAccountService, useClass: AccountService }],
})
export class AccountModule {}
