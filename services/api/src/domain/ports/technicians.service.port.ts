import type {
  AuthUser,
  TechnicianResponse,
  UpdateTechnicianBody,
  CreateTechnicianUserAccountResponse,
  TechnicianStatus,
} from "@planwise/shared";

export abstract class AbstractTechniciansGatewayService {
  abstract createTechnician(
    currentUser: AuthUser,
    body: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      speciality?: string;
      status?: TechnicianStatus;
      calendarColor?: string;
      createUserAccount?: boolean;
    },
  ): Promise<TechnicianResponse>;
  abstract listTechnicians(currentUser: AuthUser): Promise<TechnicianResponse[]>;
  abstract getTechnician(currentUser: AuthUser, technicianId: string): Promise<TechnicianResponse>;
  abstract updateTechnician(
    currentUser: AuthUser,
    technicianId: string,
    body: UpdateTechnicianBody,
  ): Promise<TechnicianResponse>;
  abstract deleteTechnician(
    currentUser: AuthUser,
    technicianId: string,
  ): Promise<{ deleted: true }>;
  abstract createTechnicianUserAccount(
    currentUser: AuthUser,
    technicianId: string,
  ): Promise<CreateTechnicianUserAccountResponse>;
  abstract linkTechnicianUser(
    currentUser: AuthUser,
    technicianId: string,
    userId: string,
  ): Promise<TechnicianResponse>;
}
