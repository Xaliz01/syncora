import type {
  InjectTrialTestDataResponse,
  PurgeTrialTestDataResponse,
  TrialTestDataStatusResponse,
} from "@planwise/shared";
import type { QueryClient } from "@tanstack/react-query";
import { apiRequestJson, type ApiMethod } from "./api-client";

async function trialTestDataRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

export function getTrialTestDataStatus() {
  return trialTestDataRequest<TrialTestDataStatusResponse>("GET", "/trial-test-data/status");
}

export function injectTrialTestData() {
  return trialTestDataRequest<InjectTrialTestDataResponse>("POST", "/trial-test-data/inject");
}

export function purgeTrialTestData() {
  return trialTestDataRequest<PurgeTrialTestDataResponse>("DELETE", "/trial-test-data");
}

/** Rafraîchit les écrans qui dépendent des données injectées (tableau de bord, listes, etc.). */
export async function invalidateQueriesAfterDemoDataChange(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-stat-cases"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-todo-cases"] }),
    queryClient.invalidateQueries({ queryKey: ["cases"] }),
    queryClient.invalidateQueries({ queryKey: ["customers"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar-interventions"] }),
    queryClient.invalidateQueries({ queryKey: ["unscheduled-interventions"] }),
    queryClient.invalidateQueries({ queryKey: ["articles"] }),
    queryClient.invalidateQueries({ queryKey: ["case-templates"] }),
    queryClient.invalidateQueries({ queryKey: ["fleet-teams"] }),
    queryClient.invalidateQueries({ queryKey: ["fleet-technicians"] }),
    queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] }),
    queryClient.invalidateQueries({ queryKey: ["fleet-agences"] }),
    queryClient.invalidateQueries({ queryKey: ["global-search"] }),
  ]);
}
