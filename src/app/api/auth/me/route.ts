import { NextRequest, NextResponse } from "next/server";
import { findAccount, publicAccount } from "@/lib/auth/accounts";
import { readAccountId, setAccountCookie } from "@/lib/auth/session";
import { readyState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = readAccountId(req);
  if (!id) {
    return NextResponse.json({ account: null, googleEnabled: false });
  }
  const state = await readyState();
  const row = findAccount(state, id);
  const account = row ? publicAccount(row) : null;
  const res = NextResponse.json({ account, googleEnabled: false });
  if (account) setAccountCookie(res, account.id);
  return res;
}
