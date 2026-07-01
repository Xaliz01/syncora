import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HealthController, provideHealthServiceName } from "@planwise/shared/nest";
import { CustomersController } from "../presentation/http/customers.controller";
import { TestDataController } from "../presentation/http/test-data.controller";
import { AbstractCustomersService } from "../domain/ports/customers.service.port";
import { CustomersService } from "../domain/customers.service";
import { CustomerSchema } from "../persistence/customer.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-customers",
    ),
    MongooseModule.forFeature([{ name: "Customer", schema: CustomerSchema }]),
  ],
  controllers: [CustomersController, TestDataController, HealthController],
  providers: [
    provideHealthServiceName("planwise-customers-service"),
    { provide: AbstractCustomersService, useClass: CustomersService },
  ],
})
export class AppModule {}
