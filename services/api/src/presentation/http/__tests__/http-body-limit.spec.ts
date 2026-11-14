import { Body, Controller, Module, Post } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { configureHttpBodyParser } from "../../../http-app";

@Controller("probe")
class ProbeController {
  @Post("echo")
  echo(@Body() body: { payload?: string }) {
    return { length: body.payload?.length ?? 0 };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe("HTTP JSON body limit", () => {
  const oversizedForDefaultParser = { payload: "a".repeat(200_000) };

  it("rejects a payload above Express default 100kb", async () => {
    const app = await NestFactory.create<NestExpressApplication>(ProbeModule, {
      logger: false,
    });
    await app.init();
    const response = await request(app.getHttpServer())
      .post("/probe/echo")
      .send(oversizedForDefaultParser);
    expect(response.status).toBe(413);
    await app.close();
  });

  it("accepts a copilote-sized JSON payload after raising the parser limit", async () => {
    const app = await NestFactory.create<NestExpressApplication>(ProbeModule, {
      logger: false,
      bodyParser: false,
    });
    configureHttpBodyParser(app);
    await app.init();
    const response = await request(app.getHttpServer())
      .post("/probe/echo")
      .send(oversizedForDefaultParser);
    expect(response.status).toBe(201);
    expect(response.body.length).toBe(200_000);
    await app.close();
  });
});
