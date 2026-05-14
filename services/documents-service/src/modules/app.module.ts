import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DocumentController } from "../presentation/http/document.controller";
import { DocumentSchema } from "../persistence/document.schema";
import { AbstractDocumentService } from "../domain/ports/document.service.port";
import { DocumentService } from "../domain/document.service";
import { AbstractStorageProvider } from "../infrastructure/storage.port";
import { LocalStorageProvider } from "../infrastructure/local-storage.provider";
import { S3StorageProvider } from "../infrastructure/s3-storage.provider";

const isProduction = process.env.STORAGE_PROVIDER === "s3";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-documents"
    ),
    MongooseModule.forFeature([
      { name: "DocumentRecord", schema: DocumentSchema }
    ])
  ],
  controllers: [DocumentController],
  providers: [
    {
      provide: AbstractStorageProvider,
      useClass: isProduction ? S3StorageProvider : LocalStorageProvider
    },
    { provide: AbstractDocumentService, useClass: DocumentService }
  ]
})
export class AppModule {}
