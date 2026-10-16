import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DocumentSchema } from "../persistence/documents/document.schema";
import { AbstractDocumentsService } from "../domain/documents/ports/documents.service.port";
import { DocumentsService } from "../domain/documents/documents.service";
import { AbstractStorageProvider } from "../infrastructure/storage/storage.port";
import { LocalStorageProvider } from "../infrastructure/storage/local-storage.provider";
import { S3StorageProvider } from "../infrastructure/storage/s3-storage.provider";

const useS3 = process.env.STORAGE_PROVIDER === "s3";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "DocumentRecord", schema: DocumentSchema }], "documents"),
  ],
  providers: [
    {
      provide: AbstractStorageProvider,
      useClass: useS3 ? S3StorageProvider : LocalStorageProvider,
    },
    { provide: AbstractDocumentsService, useClass: DocumentsService },
  ],
  exports: [AbstractDocumentsService, AbstractStorageProvider],
})
export class DocumentsDomainModule {}
