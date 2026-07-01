import { Controller, Get, Inject } from "@nestjs/common";
import { buildHealthPayload } from "./runtime-version";

export const HEALTH_SERVICE_NAME = Symbol("HEALTH_SERVICE_NAME");

@Controller()
export class HealthController {
  constructor(@Inject(HEALTH_SERVICE_NAME) private readonly serviceName: string) {}

  @Get("health")
  getHealth() {
    return buildHealthPayload(this.serviceName);
  }
}

/** Provider à enregistrer dans le module Nest du microservice. */
export function provideHealthServiceName(serviceName: string) {
  return { provide: HEALTH_SERVICE_NAME, useValue: serviceName };
}
