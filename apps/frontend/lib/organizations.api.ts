import type {
  OrganizationResponse,
  SiretLookupResponse,
  UpdateOrganizationBody,
  UserOrganizationsListResponse,
} from "@syncora/shared";
import { apiRequestJson } from "./api-client";

export function listMine() {
  return apiRequestJson<UserOrganizationsListResponse>("GET", "/organizations/mine");
}

export function getMineCurrent() {
  return apiRequestJson<OrganizationResponse>("GET", "/organizations/mine/current");
}

export function updateMine(body: UpdateOrganizationBody) {
  return apiRequestJson<OrganizationResponse>("PATCH", "/organizations/mine", { body });
}

export function lookupSiret(query: string) {
  return apiRequestJson<SiretLookupResponse>(
    "GET",
    `/organizations/siret-lookup?q=${encodeURIComponent(query)}`,
  );
}
