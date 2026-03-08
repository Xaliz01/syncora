import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OrganizationsController } from "../presentation/http/organizations.controller";
import { OrganizationSchema } from "../persistence/organization.schema";
import { AbstractOrganizationsService } from "../domain/ports/organizations.service.port";
import { OrganizationsService } from "../domain/organizations.service";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-organizations"),
    MongooseModule.forFeature([{ name: "Organization", schema: OrganizationSchema }])
  ],
  controllers: [OrganizationsController],
  providers: [{ provide: AbstractOrganizationsService, useClass: OrganizationsService }]
})
export class AppModule {}
