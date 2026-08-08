import type {
  CaseTemplateResponse,
  CreateCaseTemplateBody,
  UpdateCaseTemplateBody,
} from "@planwise/shared";

export abstract class AbstractCaseTemplatesService {
  abstract createTemplate(body: CreateCaseTemplateBody): Promise<CaseTemplateResponse>;
  abstract listTemplates(organizationId: string): Promise<CaseTemplateResponse[]>;
  abstract getTemplate(id: string, organizationId: string): Promise<CaseTemplateResponse>;
  abstract updateTemplate(id: string, body: UpdateCaseTemplateBody): Promise<CaseTemplateResponse>;
  abstract deleteTemplate(id: string, organizationId: string): Promise<{ deleted: true }>;
}
