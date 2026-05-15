import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DocumentsController } from "../presentation/http/documents.controller";
import { DocumentSchema } from "../persistence/document.schema";
import { AbstractDocumentsService } from "../domain/ports/documents.service.port";
import { DocumentsService } from "../domain/documents.service";
import { AbstractStorageProvider } from "../infrastructure/storage.port";
import { LocalStorageProvider } from "../infrastructure/local-storage.provider";
import { S3StorageProvider } from "../infrastructure/s3-storage.provider";

const isProduction = process.env.STORAGE_PROVIDER === "s3";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-documents",
    ),
    MongooseModule.forFeature([{ name: "DocumentRecord", schema: DocumentSchema }]),
  ],
  controllers: [DocumentsController],
  providers: [
    {
      provide: AbstractStorageProvider,
      useClass: isProduction ? S3StorageProvider : LocalStorageProvider,
    },
    { provide: AbstractDocumentsService, useClass: DocumentsService },
  ],
})
export class AppModule {}
