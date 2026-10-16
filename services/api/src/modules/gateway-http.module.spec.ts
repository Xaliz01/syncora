import { MODULE_METADATA } from "@nestjs/common/constants";
import { GatewayHttpModule } from "./gateway-http.module";
import { UsersModule } from "./users.module";

describe("GatewayHttpModule", () => {
  it("re-exports users so JwtAuthGuard can resolve sessions in every controller module", () => {
    const exported = Reflect.getMetadata(MODULE_METADATA.EXPORTS, GatewayHttpModule) as unknown[];
    expect(exported).toContain(UsersModule);
  });
});
