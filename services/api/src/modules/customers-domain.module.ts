import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomerSchema } from "../persistence/customers/customer.schema";
import { OrderGiverSchema } from "../persistence/customers/order-giver.schema";
import { AbstractCustomersService } from "../domain/customers/ports/customers.service.port";
import { CustomersService } from "../domain/customers/customers.service";
import { AbstractOrderGiversService } from "../domain/customers/ports/order-givers.service.port";
import { OrderGiversService } from "../domain/customers/order-givers.service";
import { AbstractCustomersDataImportService } from "../domain/customers/ports/customers-data-import.service.port";
import { CustomersDataImportService } from "../domain/customers/customers-data-import.service";

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: "Customer", schema: CustomerSchema },
        { name: "OrderGiver", schema: OrderGiverSchema },
      ],
      "customers",
    ),
  ],
  providers: [
    { provide: AbstractCustomersService, useClass: CustomersService },
    { provide: AbstractOrderGiversService, useClass: OrderGiversService },
    { provide: AbstractCustomersDataImportService, useClass: CustomersDataImportService },
  ],
  exports: [
    AbstractCustomersService,
    AbstractOrderGiversService,
    AbstractCustomersDataImportService,
  ],
})
export class CustomersDomainModule {}
