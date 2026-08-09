import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type {
  CreatePlatformEmailTemplateBody,
  UpdatePlatformEmailTemplateBody,
} from "@planwise/shared";
import { isPlatformEmailTemplatePurpose } from "@planwise/shared";
import { AbstractEmailTemplatesService } from "../../domain/ports/email-templates.service.port";

@Controller("users/platform/email-templates")
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: AbstractEmailTemplatesService) {}

  @Get()
  list(@Query("purpose") purpose?: string) {
    if (purpose && !isPlatformEmailTemplatePurpose(purpose)) {
      throw new BadRequestException("Purpose invalide");
    }
    return this.emailTemplatesService.list({
      purpose: purpose && isPlatformEmailTemplatePurpose(purpose) ? purpose : undefined,
    });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.emailTemplatesService.getById(id);
  }

  @Post()
  create(@Body() body: CreatePlatformEmailTemplateBody) {
    return this.emailTemplatesService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdatePlatformEmailTemplateBody) {
    return this.emailTemplatesService.update(id, body);
  }

  @Post(":id/set-default")
  setDefault(@Param("id") id: string) {
    return this.emailTemplatesService.setDefault(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.emailTemplatesService.remove(id);
  }
}
