import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TREASURY_KEEP_LAMPORTS,
  TREASURY_MIN_SEND_LAMPORTS,
  planTreasuryWithdraw,
} from "../lib/treasury/withdraw";

describe("treasury withdraw plan", () => {
  it("keeps 0.002 SOL in the treasury on a 100 percent pull", () => {
    const bal = 1 * LAMPORTS_PER_SOL;
    const p = planTreasuryWithdraw(bal, "pct", 100);
    assert.equal(p.ok, true);
    if (!p.ok) return;
    assert.equal(p.lamports, bal - TREASURY_KEEP_LAMPORTS);
    assert.equal(p.remainingLamports, TREASURY_KEEP_LAMPORTS);
  });

  it("sends an exact SOL amount when there is headroom", () => {
    const p = planTreasuryWithdraw(2 * LAMPORTS_PER_SOL, "sol", 0.5);
    assert.equal(p.ok, true);
    if (!p.ok) return;
    assert.equal(p.lamports, 0.5 * LAMPORTS_PER_SOL);
  });

  it("caps a SOL amount at spendable", () => {
    const p = planTreasuryWithdraw(0.1 * LAMPORTS_PER_SOL, "sol", 5);
    assert.equal(p.ok, true);
    if (!p.ok) return;
    assert.equal(p.lamports, 0.1 * LAMPORTS_PER_SOL - TREASURY_KEEP_LAMPORTS);
  });

  it("rejects empty and dust", () => {
    assert.equal(planTreasuryWithdraw(TREASURY_KEEP_LAMPORTS, "pct", 100).ok, false);
    assert.equal(planTreasuryWithdraw(1 * LAMPORTS_PER_SOL, "sol", 0.0001).ok, false);
    assert.equal(planTreasuryWithdraw(1 * LAMPORTS_PER_SOL, "pct", 0).ok, false);
    assert.ok(TREASURY_MIN_SEND_LAMPORTS >= 1_000_000);
  });
});
