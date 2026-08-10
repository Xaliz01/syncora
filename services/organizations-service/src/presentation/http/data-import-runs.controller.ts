import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { CreateDataImportRunBody } from "@planwise/shared";
import { AbstractDataImportRunsService } from "../../domain/ports/data-import-runs.service.port";

@Controller("data-import-runs")
export class DataImportRunsController {
  constructor(private readonly runsService: AbstractDataImportRunsService) {}

  @Post()
  create(@Body() body: CreateDataImportRunBody) {
    return this.runsService.create(body);
  }

  @Get()
  list(
    @Query("organizationId") organizationId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.runsService.list(organizationId, {
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Get(":id")
  async findById(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Query("includeIds") includeIds?: string,
  ) {
    if (includeIds === "1" || includeIds === "true") {
      const run = await this.runsService.findByIdWithIds(organizationId, id);
      if (!run) throw new NotFoundException("Import introuvable");
      return run;
    }
    const run = await this.runsService.findById(organizationId, id);
    if (!run) throw new NotFoundException("Import introuvable");
    return run;
  }

  @Patch(":id/rolled-back")
  markRolledBack(@Param("id") id: string, @Body() body: { organizationId: string }) {
    return this.runsService.markRolledBack(body.organizationId, id);
  }
}
