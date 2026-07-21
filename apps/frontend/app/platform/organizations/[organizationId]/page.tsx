import { use } from "react";
import { PlatformOrganizationDetailPage } from "@/components/platform/PlatformOrganizationDetailPage";

export default function PlatformOrganizationRoute({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  return <PlatformOrganizationDetailPage organizationId={organizationId} />;
}
