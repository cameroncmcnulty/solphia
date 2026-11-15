import { NextRequest, NextResponse } from "next/server";
import { isReservedV3Host, v3HostFromHeader } from "@/lib/tools/v3/host";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const sub = v3HostFromHeader(host);
  if (sub && !isReservedV3Host(sub) && !sub.includes(".")) {
    const path = req.nextUrl.pathname;
    if (!path.startsWith("/api/") && !path.startsWith("/_next") && !path.startsWith("/m/")) {
      const url = req.nextUrl.clone();
      url.pathname = path === "/" ? `/m/${sub}` : `/m/${sub}${path}`;
      const rewrite = NextResponse.rewrite(url);
      rewrite.headers.set("X-Robots-Tag", "noindex");
      return rewrite;
    }
  }

  const res = NextResponse.next();
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
