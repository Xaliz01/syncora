import { permanentRedirect, redirect } from "next/navigation";
import { isLegalPath } from "@/lib/legal/routes";

function marketingOrigin(): string {
  const host = process.env.NEXT_PUBLIC_MARKETING_HOST?.trim() || "planwise.fr";
  return `https://${host}`;
}

export default function CatchAll({ params }: { params: { rest: string[] } }) {
  const pathname = `/${params.rest.join("/")}`;

  // Filet de sécurité : ne jamais renvoyer les URLs légales vers le dashboard (/).
  if (isLegalPath(pathname)) {
    permanentRedirect(`${marketingOrigin()}${pathname}`);
  }

  redirect("/");
}
