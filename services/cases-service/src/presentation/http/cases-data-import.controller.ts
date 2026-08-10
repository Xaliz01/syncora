import { Body, Controller, Post } from "@nestjs/common";
import type {
  DataImportDeleteCreatedBody,
  ImportCasesBody,
  ImportInterventionsBody,
} from "@planwise/shared";
import { AbstractCasesDataImportService } from "../../domain/ports/cases-data-import.service.port";

@Controller("import")
export class CasesDataImportController {
  constructor(private readonly importService: AbstractCasesDataImportService) {}

  @Post("cases")
  importCases(@Body() body: ImportCasesBody) {
    return this.importService.importCases(body);
  }

  @Post("interventions")
  importInterventions(@Body() body: ImportInterventionsBody) {
    return this.importService.importInterventions(body);
  }

  @Post("resolve/cases")
  resolveCases(@Body() body: { organizationId: string; externalIds: string[] }) {
    return this.importService.resolveCaseIds(body.organizationId, body.externalIds ?? []);
  }

  @Post("delete-created")
  deleteCreated(@Body() body: DataImportDeleteCreatedBody) {
    return this.importService.deleteCreated(body);
  }
}
