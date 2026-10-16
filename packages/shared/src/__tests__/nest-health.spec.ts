import { HealthController, provideHealthServiceName } from "../nest-health";

describe("HealthController", () => {
  it("expose GET /health avec le nom de service injecté", () => {
    const controller = new HealthController("planwise-api");

    expect(controller.getHealth()).toEqual({
      status: "ok",
      service: "planwise-api",
      version: "dev",
    });
  });

  it("fournit un provider pour le nom de service", () => {
    expect(provideHealthServiceName("planwise-worker")).toEqual({
      provide: expect.any(Symbol),
      useValue: "planwise-worker",
    });
  });
});
