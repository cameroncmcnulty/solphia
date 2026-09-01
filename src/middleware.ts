import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex");
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (origin && !["https://solphia.io", "http://localhost:3100", "http://127.0.0.1:3100"].includes(origin)) {
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
