import { HealthController, provideHealthServiceName } from "../nest-health";

describe("HealthController", () => {
  it("expose GET /health avec le nom de service injecté", () => {
    const controller = new HealthController("planwise-users-service");

    expect(controller.getHealth()).toEqual({
      status: "ok",
      service: "planwise-users-service",
      version: "dev",
    });
  });

  it("fournit un provider pour le nom de service", () => {
    expect(provideHealthServiceName("planwise-cases-service")).toEqual({
      provide: expect.any(Symbol),
      useValue: "planwise-cases-service",
    });
  });
});
