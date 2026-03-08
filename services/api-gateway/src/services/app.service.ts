import { Injectable } from "@nestjs/common";
import { AbstractAppService } from "../domain/ports/app.service.port";

@Injectable()
export class AppService extends AbstractAppService {
  getHealth() {
    return {
      status: "ok",
      service: "api-gateway"
    };
  }
}

