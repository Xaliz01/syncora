import { Controller, Get } from "@nestjs/common";
import { AbstractAppService } from "../../domain/ports/app.service.port";

@Controller()
export class AppController {
  constructor(private readonly appService: AbstractAppService) {}

  @Get("health")
  getHealth() {
    return this.appService.getHealth();
  }
}
