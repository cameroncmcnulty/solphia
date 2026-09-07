import { NextRequest, NextResponse } from "next/server";
import { isSolanaAddress } from "@/lib/security";
import { readyState } from "@/lib/store";
import { isFounder, liveSeatOk, levSeatOk } from "@/lib/access";
import { treasuryAddress } from "@/lib/treasury";
import { publicSeat, seatSol, SEAT_PERIOD_DAYS } from "@/lib/seat";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  if (!isSolanaAddress(pubkey)) return NextResponse.json({ founder: false, plan: null });
  const s = await readyState();
  const user = s.users.find((u) => u.pubkey === pubkey);
  const founder = isFounder(s, pubkey);
  const seat = publicSeat(user);
  return NextResponse.json({
    founder,
    plan: founder ? "lev" : user?.plan || null,
    subscribedUntil: founder ? user?.subscribedUntil || Date.now() + 86400000 : seat.subscribedUntil,
    autoRenew: founder ? false : seat.autoRenew,
    tosAcceptedAt: seat.tosAcceptedAt,
    due: founder ? false : seat.due,
    liveSeat: liveSeatOk(s, pubkey),
    levSeat: levSeatOk(s, pubkey),
    seatSol: seatSol(founder ? "lev" : user?.plan),
    periodDays: SEAT_PERIOD_DAYS,
    treasury: treasuryAddress() || null,
    lastPaidAt: seat.lastPaidAt,
  });
}
