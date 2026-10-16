import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { InvoiceSchema } from "../persistence/billing/invoice.schema";
import { InvoiceSequenceSchema } from "../persistence/billing/invoice-sequence.schema";
import { AbstractInvoicesService } from "../domain/billing/ports/invoices.service.port";
import { InvoicesService } from "../domain/billing/invoices.service";
import { NotificationsDomainModule } from "./notifications-domain.module";

@Module({
  imports: [
    NotificationsDomainModule,
    MongooseModule.forFeature(
      [
        { name: "Invoice", schema: InvoiceSchema },
        { name: "InvoiceSequence", schema: InvoiceSequenceSchema },
      ],
      "billing",
    ),
  ],
  providers: [{ provide: AbstractInvoicesService, useClass: InvoicesService }],
  exports: [AbstractInvoicesService],
})
export class BillingDomainModule {}
