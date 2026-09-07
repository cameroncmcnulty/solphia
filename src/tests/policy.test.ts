import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_STUDY } from "../lib/pair/knowledge";
import { TRADE_PAIRS } from "../lib/pair/catalog";
import { reviewTrade, roundTripBps } from "../lib/pair/policy";
import type { RatioRead, RatioSample } from "../lib/pair/ratio";

const NOW = Date.UTC(2026, 8, 3, 18, 0, 0);

function read(z7: number, z24: number, n7 = 48): RatioRead {
  return {
    ratio: 1,
    logR: 0,
    mean24: 0,
    mean7: 0,
    std24: 0.01,
    std7: 0.01,
    z24,
    z7,
    n24: n7,
    n7,
    asset: "sol-spyx",
    pairId: "sol-spyx",
  };
}

function samples(sol = 100, spyx = 770, qqqx = 480, gldx = 310, n = 48): RatioSample[] {
  const hour = 3_600_000;
  const out: RatioSample[] = [];
  for (let i = n; i >= 1; i--) {
    out.push({ t: NOW - i * hour, sol, spyx, qqqx, gldx });
  }
  out.push({ t: NOW, sol, spyx, qqqx, gldx });
  return out;
}

const pair = TRADE_PAIRS.find((p) => p.id === "sol-spyx")!;
const gldPair = TRADE_PAIRS.find((p) => p.id === "usdc-gldx")!;

describe("trade policy", () => {
  it("round-trip includes the 0.1% protocol fee", () => {
    assert.equal(roundTripBps(0), 5 + 10 + 4);
  });

  it("lets a clean stretched SOL/SPYx trade through", () => {
    const v = reviewTrade({
      pair,
      from: "SOL",
      to: "SPYx",
      high: true,
      read: read(2.1, 1.2),
      ext7: 0.04,
      session: "cash",
      study: DEFAULT_STUDY,
      equity: 1000,
      fromUsd: 400,
      toUsd: 200,
      clipUsd: 80,
      impactPct: 0.002,
      samples: samples(),
      now: NOW,
    });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.ok(v.score > 0);
      assert.match(v.reason, /fees/i);
    }
  });

  it("refuses to buy SOL on a risk-off dump", () => {
    const tape = samples(100, 770);
    tape[tape.length - 1] = { t: NOW, sol: 90, spyx: 740, qqqx: 450, gldx: 318 };
    const v = reviewTrade({
      pair,
      from: "SPYx",
      to: "SOL",
      high: false,
      read: read(-2.2, -1.1),
      ext7: 0.05,
      session: "cash",
      study: { ...DEFAULT_STUDY, solRet24h: -0.1, spyRet24h: -0.04, qqqRet24h: -0.05, gldRet24h: 0.02 },
      equity: 1000,
      fromUsd: 300,
      toUsd: 200,
      clipUsd: 80,
      impactPct: 0,
      samples: tape,
      now: NOW,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.match(v.reason, /Risk-off|knife|dump/i);
  });

  it("does not fade gold on a safe-haven bid", () => {
    const v = reviewTrade({
      pair: gldPair,
      from: "GLDx",
      to: "USDC",
      high: false,
      read: read(-2, -1.2),
      ext7: 0.03,
      session: "cash",
      study: { ...DEFAULT_STUDY, solRet24h: -0.06, gldRet24h: 0.025, spyRet24h: -0.01 },
      equity: 1000,
      fromUsd: 200,
      toUsd: 200,
      clipUsd: 50,
      impactPct: 0,
      samples: samples(94, 770, 480, 330),
      now: NOW,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.match(v.reason, /safe-haven|Gold/i);
  });

  it("skips a move that fees would eat", () => {
    const v = reviewTrade({
      pair,
      from: "SOL",
      to: "SPYx",
      high: true,
      read: read(1.4, 0.8),
      ext7: 0.001,
      session: "cash",
      study: DEFAULT_STUDY,
      equity: 1000,
      fromUsd: 400,
      toUsd: 200,
      clipUsd: 80,
      impactPct: 0.003,
      samples: samples(),
      now: NOW,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.match(v.reason, /fees/i);
  });
});
