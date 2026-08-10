import type { DataImportRunSummary } from "@planwise/shared";
import type { DataImportRunDocument } from "../../persistence/data-import-run.schema";

export function toDataImportRunSummary(doc: DataImportRunDocument): DataImportRunSummary {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    entity: doc.entity,
    fileName: doc.fileName,
    createdByUserId: doc.createdByUserId,
    createdAt: doc.createdAt.toISOString(),
    status: doc.status,
    rolledBackAt: doc.rolledBackAt?.toISOString(),
    stats: {
      created: doc.stats.created,
      updated: doc.stats.updated,
      skipped: doc.stats.skipped,
      errorCount: doc.stats.errorCount,
    },
    createdCount:
      doc.status === "rolled_back" ? 0 : (doc.createdResourceIds?.length ?? doc.stats.created),
  };
}
