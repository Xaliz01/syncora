import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import {
  HealthController,
  provideHealthServiceName,
  provideHttpAccessLogInterceptor,
} from "@planwise/shared/nest";
import { InvoicesController } from "../presentation/http/invoices.controller";
import { AbstractInvoicesService } from "../domain/ports/invoices.service.port";
import { InvoicesService } from "../domain/invoices.service";
import { InvoiceSchema } from "../persistence/invoice.schema";
import { InvoiceSequenceSchema } from "../persistence/invoice-sequence.schema";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-billing"),
    MongooseModule.forFeature([
      { name: "Invoice", schema: InvoiceSchema },
      { name: "InvoiceSequence", schema: InvoiceSequenceSchema },
    ]),
    HttpModule.register({ timeout: 60000, maxRedirects: 0 }),
  ],
  controllers: [InvoicesController, HealthController],
  providers: [
    provideHealthServiceName("planwise-billing-service"),
    provideHttpAccessLogInterceptor(),
    { provide: AbstractInvoicesService, useClass: InvoicesService },
  ],
})
export class AppModule {}
