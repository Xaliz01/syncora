import { NextRequest, NextResponse } from "next/server";
import { resolveHostRouting } from "@/lib/host-routing";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;

  const routing = resolveHostRouting(host, pathname, search);
  if (routing.action === "next") {
    return NextResponse.next();
  }

  const destination = routing.destination.startsWith("/")
    ? new URL(routing.destination, request.url)
    : routing.destination;

  return NextResponse.redirect(destination, routing.permanent ? 308 : 307);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|~offline).*)",
  ],
};
