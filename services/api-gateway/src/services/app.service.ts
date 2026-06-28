import { Injectable } from "@nestjs/common";
import { buildHealthPayload } from "@syncora/shared";
import { AbstractAppService } from "../domain/ports/app.service.port";

@Injectable()
export class AppService extends AbstractAppService {
  getHealth() {
    return buildHealthPayload("api-gateway");
  }
}
