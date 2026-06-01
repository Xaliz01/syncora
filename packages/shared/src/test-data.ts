/** Données de démonstration injectées pendant l’essai gratuit. */

export const TRIAL_TEST_DATA_STATUSES = ["none", "injecting", "ready", "failed"] as const;
export type TrialTestDataStatus = (typeof TRIAL_TEST_DATA_STATUSES)[number];

export interface TrialTestDataStatusResponse {
  status: TrialTestDataStatus;
  /** Au moins une entité marquée isTestData existe encore. */
  hasTestData: boolean;
  injectedAt: string | null;
  errorMessage?: string | null;
}

export interface PurgeTrialTestDataResponse {
  purged: true;
}

export interface InjectTrialTestDataResponse {
  accepted: true;
}

/** Champ optionnel sur les entités créées en démo. */
export type WithTestDataFlag<T> = T & { isTestData?: boolean };
