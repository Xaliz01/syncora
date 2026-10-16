import type {
  CreateProspectOutreachBody,
  ProspectOutreachResponse,
  ProspectOutreachStatus,
  ProspectOutreachesBySirensResponse,
  ProspectOutreachesListResponse,
  UpsertProspectCommentBody,
} from "@planwise/shared";

export abstract class AbstractProspectOutreachService {
  abstract createProspectOutreach(
    body: CreateProspectOutreachBody,
  ): Promise<ProspectOutreachResponse>;
  abstract upsertProspectComment(
    body: UpsertProspectCommentBody,
  ): Promise<ProspectOutreachResponse>;
  abstract listProspectOutreachesBySirens(
    sirens: string[],
  ): Promise<ProspectOutreachesBySirensResponse>;
  abstract listProspectOutreaches(options?: {
    limit?: number;
    offset?: number;
    status?: ProspectOutreachStatus;
    search?: string;
  }): Promise<ProspectOutreachesListResponse>;
}
