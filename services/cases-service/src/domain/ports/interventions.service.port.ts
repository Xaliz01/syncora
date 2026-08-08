import type {
  CompleteInterventionBody,
  CompleteInterventionResponse,
  CreateInterventionBody,
  InterventionResponse,
  InterventionsListResponse,
  SignInterventionBody,
  SignInterventionResponse,
  StartInterventionBody,
  StartInterventionResponse,
  UpdateInterventionBody,
} from "@planwise/shared";

export abstract class AbstractInterventionsService {
  abstract createIntervention(body: CreateInterventionBody): Promise<InterventionResponse>;
  abstract listInterventions(
    organizationId: string,
    filters?: {
      caseId?: string;
      assigneeId?: string;
      assignedTeamId?: string;
      assignedTeamIds?: string[];
      startDate?: string;
      endDate?: string;
      status?: string;
      unscheduled?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<InterventionsListResponse>;
  abstract getIntervention(id: string, organizationId: string): Promise<InterventionResponse>;
  abstract updateIntervention(
    id: string,
    body: UpdateInterventionBody,
  ): Promise<InterventionResponse>;
  abstract deleteIntervention(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract startIntervention(
    id: string,
    body: StartInterventionBody,
  ): Promise<StartInterventionResponse>;
  abstract completeIntervention(
    id: string,
    body: CompleteInterventionBody,
  ): Promise<CompleteInterventionResponse>;
  abstract signIntervention(
    id: string,
    body: SignInterventionBody,
  ): Promise<SignInterventionResponse>;
  abstract getInterventionWithSignature(
    id: string,
    organizationId: string,
  ): Promise<{ signatureData?: string; signatoryName?: string }>;
  abstract listUpcomingInterventions(from: string, to: string): Promise<InterventionResponse[]>;
}
