import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const pathname = req.nextUrl.pathname;

  // Skip API routes, static files, and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Handle subdomain detection (e.g. lumeir.localhost:3000 or lumeir.aurwell.app)
  const hostWithoutPort = host.split(":")[0];
  const parts = hostWithoutPort.split(".");

  let subdomain = "";
  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    // e.g. "lumeir.localhost" -> parts = ["lumeir", "localhost"]
    if (parts[0] !== "localhost") {
      subdomain = parts[0].toLowerCase();
    }
  } else if (parts.length >= 3) {
    // e.g. "lumeir.aurwell.app" -> parts = ["lumeir", "aurwell", "app"]
    if (parts[0] !== "www" && parts[0] !== "aurwell") {
      subdomain = parts[0].toLowerCase();
    }
  }

  if (subdomain) {
    // On a clinic subdomain, any route (/, /booking, /book, /schedule, /reschedule)
    // rewrites to /book/${subdomain} while preserving all query parameters
    if (pathname !== `/book/${subdomain}`) {
      const url = req.nextUrl.clone();
      url.pathname = `/book/${subdomain}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
