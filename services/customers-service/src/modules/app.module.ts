import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  HealthController,
  provideHealthServiceName,
  provideHttpAccessLogInterceptor,
} from "@planwise/shared/nest";
import { CustomersController } from "../presentation/http/customers.controller";
import { OrderGiversController } from "../presentation/http/order-givers.controller";
import { TestDataController } from "../presentation/http/test-data.controller";
import { AbstractCustomersService } from "../domain/ports/customers.service.port";
import { CustomersService } from "../domain/customers.service";
import { AbstractOrderGiversService } from "../domain/ports/order-givers.service.port";
import { OrderGiversService } from "../domain/order-givers.service";
import { CustomerSchema } from "../persistence/customer.schema";
import { OrderGiverSchema } from "../persistence/order-giver.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-customers",
    ),
    MongooseModule.forFeature([
      { name: "Customer", schema: CustomerSchema },
      { name: "OrderGiver", schema: OrderGiverSchema },
    ]),
  ],
  controllers: [CustomersController, OrderGiversController, TestDataController, HealthController],
  providers: [
    provideHealthServiceName("planwise-customers-service"),
    provideHttpAccessLogInterceptor(),
    { provide: AbstractCustomersService, useClass: CustomersService },
    { provide: AbstractOrderGiversService, useClass: OrderGiversService },
  ],
})
export class AppModule {}
