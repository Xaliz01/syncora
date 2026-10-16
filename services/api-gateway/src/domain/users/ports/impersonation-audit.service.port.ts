export interface CreateImpersonationAuditBody {
  impersonatorUserId: string;
  impersonatorEmail: string;
  targetUserId: string;
  targetEmail: string;
  organizationId: string;
  reason: string;
  expiresAt?: string;
}

export abstract class AbstractImpersonationAuditService {
  abstract createImpersonationAudit(body: CreateImpersonationAuditBody): Promise<{ id: string }>;
}
