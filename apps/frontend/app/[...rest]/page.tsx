import { permanentRedirect, redirect } from "next/navigation";
import { isLegalPath } from "@/lib/legal/routes";

function marketingOrigin(): string {
  const host = process.env.NEXT_PUBLIC_MARKETING_HOST?.trim() || "planwise.fr";
  return `https://${host}`;
}

export default async function CatchAll({ params }: { params: Promise<{ rest: string[] }> }) {
  const { rest } = await params;
  const pathname = `/${rest.join("/")}`;

  // Filet de sécurité : ne jamais renvoyer les URLs légales vers le dashboard (/).
  if (isLegalPath(pathname)) {
    permanentRedirect(`${marketingOrigin()}${pathname}`);
  }

  redirect("/");
}
