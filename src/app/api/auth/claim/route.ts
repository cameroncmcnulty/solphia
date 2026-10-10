import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findAccount, publicAccount } from "@/lib/auth/accounts";
import { readClaimTicket, setAccountCookie } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security";
import { readyState } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  ticket: z.string(),
  next: z.string().optional(),
});

function safeNext(raw: unknown): string {
  if (typeof raw !== "string") return "/?signedin=1";
  const s = raw.trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("://") || s.includes("\\")) return "/?signedin=1";
  return s.slice(0, 180);
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(ip + ":auth-claim", 20, 10 * 60_000)) {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return NextResponse.redirect(new URL("/?auth_error=rate", req.url), 303);
    }
    return NextResponse.json({ error: "rate_limited", message: "Too many tries. Wait a bit." }, { status: 429 });
  }
  const ct = req.headers.get("content-type") || "";
  const json = ct.includes("application/json");
  let ticket = "";
  let next = "/?signedin=1";
  if (json) {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    ticket = parsed.success ? parsed.data.ticket : "";
    if (parsed.success && parsed.data.next) next = safeNext(parsed.data.next);
  } else {
    const form = await req.formData().catch(() => null);
    ticket = String(form?.get("ticket") || "");
    next = safeNext(form?.get("next"));
  }
  const id = readClaimTicket(ticket);
  if (!id) {
    if (!json) return NextResponse.redirect(new URL("/?auth_error=session", req.url), 303);
    return NextResponse.json({ error: "bad_ticket", message: "Sign-in expired. Tap Google again." }, { status: 400 });
  }
  const state = await readyState();
  const row = findAccount(state, id);
  if (!row) {
    if (!json) return NextResponse.redirect(new URL("/?auth_error=no_account", req.url), 303);
    return NextResponse.json({ error: "no_account", message: "No Solphia account for that sign-in." }, { status: 400 });
  }
  if (!json) {
    const res = NextResponse.redirect(new URL(next, req.url), 303);
    setAccountCookie(res, row.id);
    return res;
  }
  const res = NextResponse.json({ ok: true, account: publicAccount(row) });
  setAccountCookie(res, row.id);
  return res;
}
