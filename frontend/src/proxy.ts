import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The old production URLs — send both visitors and search engines to the real domain (avoids
// duplicate-content and keeps everyone on acely.in). Preview *.vercel.app URLs are left alone.
const REDIRECT_HOSTS = new Set(["acely.vercel.app", "preppal-vk.vercel.app"]);

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (REDIRECT_HOSTS.has(host)) {
    const url = new URL(req.url);
    url.protocol = "https:";
    url.host = "acely.in";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Run on page routes; skip Next internals and static assets.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
