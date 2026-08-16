import type {
  PlatformAuthUser,
  PlatformProspectCreditsResponse,
  PlatformProspectEmailNotFoundBody,
  PlatformProspectManualCreateBody,
  PlatformProspectNoteBody,
  PlatformProspectOutreachBody,
  PlatformProspectOutreachResponse,
  PlatformProspectSearchSort,
  PlatformProspectsSearchResponse,
  ProspectOutreachesListResponse,
  ProspectOutreachStatus,
} from "@planwise/shared";

export abstract class AbstractPlatformProspectsService {
  abstract searchProspects(filters?: {
    page?: number;
    perPage?: number;
    departement?: string;
    codeNaf?: string;
    preset?: string;
    sort?: PlatformProspectSearchSort;
    dateCreationMin?: string;
    refresh?: boolean;
  }): Promise<PlatformProspectsSearchResponse>;
  abstract lookupProspectBySiret(siret: string): Promise<PlatformProspectsSearchResponse>;
  abstract getProspectCredits(): Promise<PlatformProspectCreditsResponse>;
  abstract listTrackedProspects(options?: {
    limit?: number;
    offset?: number;
    status?: ProspectOutreachStatus;
    search?: string;
  }): Promise<ProspectOutreachesListResponse>;
  abstract sendProspectOutreach(
    staff: PlatformAuthUser,
    body: PlatformProspectOutreachBody,
  ): Promise<PlatformProspectOutreachResponse>;
  abstract markProspectEmailNotFound(
    staff: PlatformAuthUser,
    body: PlatformProspectEmailNotFoundBody,
  ): Promise<{ ok: true }>;
  abstract saveProspectNote(
    staff: PlatformAuthUser,
    body: PlatformProspectNoteBody,
  ): Promise<{ ok: true; comment?: string }>;
  abstract createManualProspect(
    staff: PlatformAuthUser,
    body: PlatformProspectManualCreateBody,
  ): Promise<{ ok: true }>;
}
