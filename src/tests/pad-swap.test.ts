import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PAD_SWAP_FEE_BPS, splitPadSpend } from "../lib/swap/pad";
import { SWAP_FEE_BPS } from "../lib/launch/curve";
import { pickBestQuote } from "../lib/pair/jupiter";
import { protocolFeeSol } from "../lib/swap/route";
import { clipHoldingUsd, HOLDING_CLIP_MAX } from "../lib/pair/engine";

describe("pad swap fee", () => {
  it("takes 1% of SOL spend for the protocol, rest goes to Jupiter", () => {
    assert.equal(PAD_SWAP_FEE_BPS, SWAP_FEE_BPS);
    assert.equal(PAD_SWAP_FEE_BPS, 100);
    const { feeSol, swapSol } = splitPadSpend(1);
    assert.equal(feeSol, 0.01);
    assert.equal(swapSol, 0.99);
    const small = splitPadSpend(0.25);
    assert.ok(Math.abs(small.feeSol + small.swapSol - 0.25) < 1e-9);
    assert.ok(small.swapSol > 0.2);
  });
});

describe("in-house bot router", () => {
  it("picks the fatter net out and skips a hop if it is worse", () => {
    const thin = {
      ok: true as const,
      quote: {} as never,
      impactPct: 0.004,
      outAmount: 100,
    };
    const fat = {
      ok: true as const,
      quote: {} as never,
      impactPct: 0.001,
      outAmount: 100.4,
    };
    const hop = {
      ok: true as const,
      quote: {} as never,
      impactPct: 0.002,
      outAmount: 100.2,
      viaUsdc: true,
    };
    const best = pickBestQuote([thin, fat, hop]);
    assert.equal(best.ok, true);
    if (best.ok) assert.equal(best.outAmount, 100.4);
  });

  it("skims 10 bps of the clip in SOL and never dumps a sleeve", () => {
    assert.equal(protocolFeeSol(1000, 100), 0.01);
    const take = clipHoldingUsd(400);
    assert.ok(take <= 400 * HOLDING_CLIP_MAX + 1e-9);
    assert.ok(take < 400);
  });
});
