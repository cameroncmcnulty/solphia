import { NextRequest, NextResponse } from "next/server";
import { isReservedV3Host, v3HostFromHeader } from "@/lib/tools/v3/host";

export function middleware(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const sub = v3HostFromHeader(host);
  const meme = Boolean(sub && !isReservedV3Host(sub) && !sub.includes("."));
  const path = req.nextUrl.pathname;

  if (meme && !path.startsWith("/api/") && !path.startsWith("/_next") && !path.startsWith("/m/")) {
    const url = req.nextUrl.clone();
    url.pathname = path === "/" ? `/m/${sub}` : `/m/${sub}${path}`;
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-v3-handle", sub);
    const rewrite = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    rewrite.headers.set("X-Robots-Tag", "noindex");
    return rewrite;
  }

  const requestHeaders = new Headers(req.headers);
  if (meme) requestHeaders.set("x-v3-handle", sub);
  else if (path.startsWith("/m/")) {
    const handle = path.split("/").filter(Boolean)[1] || "";
    if (handle && !isReservedV3Host(handle) && !handle.includes(".")) requestHeaders.set("x-v3-handle", handle);
  }
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("X-Robots-Tag", "noindex");
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    const allowed = [
      "https://solphia.io",
      "https://www.solphia.io",
      "http://localhost:3100",
      "http://127.0.0.1:3100",
    ];
    const fromSub = origin ? /https:\/\/[a-z0-9-]+\.solphia\.io$/i.test(origin) : false;
    if (origin && !allowed.includes(origin) && !fromSub) {
      // allow same-origin browser calls; block odd cross-site POSTs
      if (req.method !== "GET") {
        return NextResponse.json({ error: "cors" }, { status: 403 });
      }
    }
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"],
};
