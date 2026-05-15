import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomersController } from "../presentation/http/customers.controller";
import { AbstractCustomersService } from "../domain/ports/customers.service.port";
import { CustomersService } from "../domain/customers.service";
import { CustomerSchema } from "../persistence/customer.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-customers",
    ),
    MongooseModule.forFeature([{ name: "Customer", schema: CustomerSchema }]),
  ],
  controllers: [CustomersController],
  providers: [{ provide: AbstractCustomersService, useClass: CustomersService }],
})
export class AppModule {}
