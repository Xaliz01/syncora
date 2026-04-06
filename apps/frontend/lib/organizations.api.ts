import type { UserOrganizationsListResponse } from "@syncora/shared";
import { apiRequestJson } from "./api-client";

export function listMine() {
  return apiRequestJson<UserOrganizationsListResponse>("GET", "/organizations/mine");
}
