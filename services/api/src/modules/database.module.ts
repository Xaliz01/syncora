import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DB_CONNECTION_NAMES, resolveDatabaseUri } from "../database-uri";

export { DB_CONNECTION_NAMES };

@Global()
@Module({
  imports: DB_CONNECTION_NAMES.map((name) =>
    MongooseModule.forRoot(resolveDatabaseUri(name), { connectionName: name }),
  ),
})
export class DatabaseModule {}
