/** API contracts for commercial services catalog (prestations) — no stock tracking */

import type { TvaRate } from "./quote";

export interface CreatePrestationBody {
  organizationId: string;
  name: string;
  reference: string;
  description?: string;
  unit?: string;
  /** Tarif HT par défaut (€). */
  defaultPrice: number;
  /** TVA par défaut (20 % si omise). */
  defaultTvaRate?: TvaRate;
  isActive?: boolean;
  isTestData?: boolean;
}

export interface UpdatePrestationBody {
  organizationId: string;
  name?: string;
  reference?: string;
  description?: string;
  unit?: string;
  defaultPrice?: number;
  defaultTvaRate?: TvaRate;
  isActive?: boolean;
}

export interface PrestationResponse {
  id: string;
  organizationId: string;
  name: string;
  reference: string;
  description?: string;
  unit: string;
  defaultPrice: number;
  defaultTvaRate: TvaRate;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  isTestData?: boolean;
}

export interface PrestationsListResponse {
  prestations: PrestationResponse[];
  total: number;
}
