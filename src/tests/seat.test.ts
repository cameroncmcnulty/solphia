import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { liveSeatOk } from "../lib/access";
import { emptyTrader } from "../lib/auto";
import { SUBSCRIPTION_SOL } from "../lib/config";
import { lamportsForPlan, PLANS } from "../lib/plans";
import {
  acceptTos,
  extendSeat,
  payerAllowed,
  seatDue,
  seatLamports,
  SEAT_PERIOD_MS,
  unsubscribeSeat,
  upsertUser,
} from "../lib/seat";
import { emptyState } from "../lib/store";

const PK = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const TRADE = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";

describe("live seat", () => {
  it("prices live at 0.1 SOL / 30d", () => {
    assert.equal(SUBSCRIPTION_SOL, 0.1);
    assert.equal(PLANS[0].sol, 0.1);
    assert.equal(lamportsForPlan("live"), 100_000_000);
    assert.equal(seatLamports(), 100_000_000);
  });

  it("a paper user is not a live seat even with a date", () => {
    const s = emptyState();
    const u = upsertUser(s, PK);
    u.plan = "paper";
    u.subscribedUntil = Date.now() + SEAT_PERIOD_MS;
    assert.equal(liveSeatOk(s, PK), false);
  });

  it("paid live seat is ok and stacks another month from the paid-through date", () => {
    const s = emptyState();
    const u = upsertUser(s, PK);
    const now = Date.now();
    acceptTos(u, now);
    extendSeat(u, now);
    assert.equal(u.plan, "live");
    assert.equal(u.autoRenew, true);
    assert.equal(u.tosAcceptedAt, now);
    assert.equal(liveSeatOk(s, PK), true);
    assert.equal(seatDue(u, now), false);
    const firstUntil = u.subscribedUntil!;
    extendSeat(u, now);
    assert.equal(u.subscribedUntil, firstUntil + SEAT_PERIOD_MS);
  });

  it("unsubscribe stops auto-renew but keeps access until paid-through", () => {
    const s = emptyState();
    const u = upsertUser(s, PK);
    extendSeat(u);
    const until = u.subscribedUntil;
    unsubscribeSeat(u);
    assert.equal(u.autoRenew, false);
    assert.equal(u.subscribedUntil, until);
    assert.equal(liveSeatOk(s, PK), true);
    assert.equal(seatDue(u), false);
  });

  it("renew is due in the last 12 hours of the seat", () => {
    const s = emptyState();
    const u = upsertUser(s, PK);
    extendSeat(u, Date.now());
    u.autoRenew = true;
    assert.equal(seatDue(u, (u.subscribedUntil || 0) - 60_000), true);
  });

  it("only the owner Phantom or the linked trading wallet may pay", () => {
    const s = emptyState();
    s.traders[PK] = emptyTrader(PK);
    s.traders[PK].tradingPubkey = TRADE;
    assert.equal(payerAllowed(s, PK, PK), true);
    assert.equal(payerAllowed(s, PK, TRADE), true);
    assert.equal(payerAllowed(s, PK, "11111111111111111111111111111111"), false);
  });
});
