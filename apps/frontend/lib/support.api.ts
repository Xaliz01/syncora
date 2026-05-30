import type { CrispIdentityResponse } from "@syncora/shared";
import { apiRequestJson } from "@/lib/api-client";

export function getCrispIdentity() {
  return apiRequestJson<CrispIdentityResponse>("GET", "/account/support/crisp-identity", {
    fallbackError: "Impossible de préparer le support en ligne",
  });
}
