import { MongooseModule } from "@nestjs/mongoose";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { NotificationsDomainModule } from "./notifications-domain.module";

describe("NotificationsDomainModule", () => {
  it("exports the notification models used by the reminder schedulers", () => {
    const exported = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      NotificationsDomainModule,
    ) as unknown[];
    expect(exported).toContain(MongooseModule);
  });
});
