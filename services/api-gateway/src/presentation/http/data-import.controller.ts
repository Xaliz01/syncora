import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  DATA_IMPORT_MAX_FILE_BYTES,
  type AuthUser,
  type DataImportSuggestMappingRequest,
} from "@planwise/shared";
import { AbstractDataImportService } from "../../domain/ports/data-import.service.port";
import { parseDataImportEntity } from "../../domain/data-import.service";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";

@Controller("imports")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class DataImportController {
  constructor(private readonly dataImportService: AbstractDataImportService) {}

  @Get("runs")
  @RequirePermissions("data_import.read")
  async listRuns(
    @CurrentUser() user: AuthUser,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.dataImportService.listRuns(user, {
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Post("runs/:id/rollback")
  @RequirePermissions("data_import.run")
  async rollbackRun(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    if (!id?.trim()) throw new BadRequestException("id est requis");
    return this.dataImportService.rollbackRun(user, id.trim());
  }

  @Post("suggest-mapping")
  @RequirePermissions("data_import.run")
  async suggestMapping(
    @CurrentUser() user: AuthUser,
    @Body() body: DataImportSuggestMappingRequest,
  ) {
    if (!body?.entity) throw new BadRequestException("entity est requis");
    return this.dataImportService.suggestMapping(user, body);
  }

  @Post("validate")
  @RequirePermissions("data_import.run")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: DATA_IMPORT_MAX_FILE_BYTES } }))
  async validate(
    @CurrentUser() user: AuthUser,
    @Query("entity") entityRaw: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!entityRaw?.trim()) throw new BadRequestException("entity est requis");
    if (!file) throw new BadRequestException("Fichier requis (champ file)");
    const entity = parseDataImportEntity(entityRaw.trim());
    return this.dataImportService.validate(user, entity, file);
  }

  @Post("run")
  @RequirePermissions("data_import.run")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: DATA_IMPORT_MAX_FILE_BYTES } }))
  async run(
    @CurrentUser() user: AuthUser,
    @Query("entity") entityRaw: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!entityRaw?.trim()) throw new BadRequestException("entity est requis");
    if (!file) throw new BadRequestException("Fichier requis (champ file)");
    const entity = parseDataImportEntity(entityRaw.trim());
    return this.dataImportService.run(user, entity, file);
  }
}
