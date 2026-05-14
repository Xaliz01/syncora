import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { DocumentsController } from "../presentation/http/documents.controller";
import { AbstractDocumentsGatewayService } from "../domain/ports/documents.service.port";
import { DocumentsGatewayService } from "../domain/documents.service";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [HttpModule.register({ timeout: 30000, maxRedirects: 0 }), SubscriptionsModule],
  controllers: [DocumentsController],
  providers: [
    { provide: AbstractDocumentsGatewayService, useClass: DocumentsGatewayService }
  ]
})
export class DocumentsModule {}
