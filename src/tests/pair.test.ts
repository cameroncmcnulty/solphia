import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_AUTO, emptyBook } from "../lib/auto";
import { decidePair, markPair } from "../lib/pair/engine";
import { flattenToUsdc, killBook, tickPairBook } from "../lib/pair/paper";
import { DEFAULT_STUDY } from "../lib/pair/knowledge";
import {
  isAllowedMint,
  isOfficialSpyx,
  isOfficialXstock,
  routeMintsOk,
  SOL_MINT,
  SPYX_MINT_OFFICIAL,
  QQQX_MINT_OFFICIAL,
  GLDX_MINT_OFFICIAL,
  USDC_MINT,
} from "../lib/pair/mints";
import { bumpBand, logRatio } from "../lib/pair/ratio";
import type { PairPrices } from "../lib/pair/prices";
import type { RatioSample } from "../lib/pair/ratio";
import type { AutoSettings } from "../lib/types";

const CASH = Date.UTC(2026, 8, 3, 18, 0, 0); // Thu 14:00 ET

function px(sol = 100, spyx = 770, liquidityUsd = 500_000, stale = false, extra?: { qqqx?: number; gldx?: number }): PairPrices {
  const qqqx = extra?.qqqx ?? 480;
  const gldx = extra?.gldx ?? 310;
  return {
    sol: { usd: sol, source: "test", at: CASH },
    spyx: { usd: spyx, source: "test", at: CASH },
    qqqx: { usd: qqqx, source: "test", at: CASH },
    gldx: { usd: gldx, source: "test", at: CASH },
    liquidityUsd,
    liquidities: { spyx: liquidityUsd, qqqx: liquidityUsd, gldx: liquidityUsd },
    stale,
    ageMs: stale ? 200_000 : 1_000,
    reason: stale ? "Prices are stale. Sitting." : undefined,
  };
}

function hist(sol = 100, spyx = 770, n = 48, extra?: { qqqx?: number; gldx?: number }): RatioSample[] {
  const hour = 3_600_000;
  const qqqx = extra?.qqqx ?? 480;
  const gldx = extra?.gldx ?? 310;
  const out: RatioSample[] = [];
  for (let i = n; i >= 1; i--) {
    const w = 1 + 0.004 * Math.sin(i / 3);
    out.push({ t: CASH - i * hour, sol: sol * w, spyx, qqqx, gldx });
  }
  return out;
}

function auto(partial: Partial<AutoSettings> = {}): AutoSettings {
  return { ...DEFAULT_AUTO, armed: true, mode: "paper", leverage: 1, ...partial };
}

describe("official mint rails", () => {
  it("pins official SPYx, QQQx, GLDx and rejects lookalikes", () => {
    assert.equal(SPYX_MINT_OFFICIAL, "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W");
    assert.equal(QQQX_MINT_OFFICIAL, "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ");
    assert.equal(GLDX_MINT_OFFICIAL, "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re");
    assert.equal(isOfficialSpyx(SPYX_MINT_OFFICIAL), true);
    assert.equal(isOfficialXstock(QQQX_MINT_OFFICIAL), true);
    assert.equal(isOfficialXstock(GLDX_MINT_OFFICIAL), true);
    assert.equal(isOfficialSpyx("So11111111111111111111111111111111111111112", "SPYx"), false);
    assert.equal(isAllowedMint(SOL_MINT), true);
    assert.equal(isAllowedMint(USDC_MINT), true);
    assert.equal(isAllowedMint(SPYX_MINT_OFFICIAL), true);
    assert.equal(isAllowedMint(QQQX_MINT_OFFICIAL), true);
    assert.equal(isAllowedMint(GLDX_MINT_OFFICIAL), true);
    assert.equal(isAllowedMint("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"), false);
    assert.equal(routeMintsOk([SOL_MINT, USDC_MINT, SPYX_MINT_OFFICIAL, QQQX_MINT_OFFICIAL, GLDX_MINT_OFFICIAL]), true);
    assert.equal(routeMintsOk([SOL_MINT, "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", SPYX_MINT_OFFICIAL]), true);
    assert.equal(routeMintsOk([SOL_MINT, "JunkMint11111111111111111111111111111111111"]), false);
  });
});

function uptrend(sol = 100, spyx = 770, n = 64, extra?: { qqqx?: number; gldx?: number }): RatioSample[] {
  const hour = 3_600_000;
  const q0 = extra?.qqqx ?? 480;
  const g0 = extra?.gldx ?? 310;
  const out: RatioSample[] = [];
  for (let i = n; i >= 1; i--) {
    const k = n - i;
    const dip = k > n - 8 && k < n - 4 ? -0.018 : 0;
    const bounce = k >= n - 4 ? 0.012 * (k - (n - 4)) : 0;
    const drift = k * 0.0009;
    out.push({
      t: CASH - i * hour,
      sol: sol * (1 + drift + dip + bounce),
      spyx: spyx * (1 + drift * 0.4 + dip * 0.3 + bounce * 0.3),
      qqqx: q0 * (1 + drift * 0.5 + dip * 0.3 + bounce * 0.4),
      gldx: g0 * (1 + drift * 0.35 + dip * 0.2 + bounce * 0.5),
    });
  }
  return out;
}

describe("USDC-home engine", () => {
  it("sits in USDC when the tape is quiet", () => {
    const book = emptyBook(1000);
    const d = decidePair({
      auto: auto({ cooldownMin: 0 }),
      book,
      prices: px(),
      samples: hist(),
      study: DEFAULT_STUDY,
      now: CASH,
    });
    assert.ok(d.action === "hold" || d.action === "skip" || (d.action === "swap" && d.from === "USDC"));
    if (d.action === "hold") assert.match(d.reason, /USDC/i);
  });

  it("buys an uptrending sleeve from USDC", () => {
    const book = emptyBook(1000);
    book.pairLearn = {
      SOL: { trades: 4, wins: 3, pnlUsd: 12, buyNeed: 0.35, trailK: 1.1 },
      SPYx: { trades: 4, wins: 3, pnlUsd: 8, buyNeed: 0.35, trailK: 1.1 },
      QQQx: { trades: 4, wins: 3, pnlUsd: 9, buyNeed: 0.35, trailK: 1.1 },
      GLDx: { trades: 4, wins: 3, pnlUsd: 10, buyNeed: 0.35, trailK: 1.1 },
    };
    const d = decidePair({
      auto: auto({ cooldownMin: 0, stopPct: 0.9 }),
      book,
      prices: px(104.2, 776, 500_000, false, { qqqx: 488, gldx: 318 }),
      samples: uptrend(100, 770, 64, { qqqx: 480, gldx: 310 }),
      study: DEFAULT_STUDY,
      now: CASH,
    });
    assert.equal(d.action, "swap");
    assert.equal(d.from, "USDC");
    assert.ok(["SOL", "SPYx", "QQQx", "GLDx"].includes(String(d.to)));
    assert.ok(d.clipUsd > 0);
  });

  it("trails a winner and sells back to USDC when the stop is hit", () => {
    const book = emptyBook(1000);
    book.pair = {
      solQty: 4,
      spyxQty: 0,
      qqqxQty: 0,
      gldxQty: 0,
      usdcQty: 200,
      solCostUsd: 400,
      stops: { SOL: { entryPx: 100, peakPx: 118, stopPx: 112, armed: true } },
    };
    const d = decidePair({
      auto: auto({ cooldownMin: 0, takeProfitPct: 0.9, stopPct: 0.9 }),
      book,
      prices: px(110, 770),
      samples: hist(100, 770),
      study: DEFAULT_STUDY,
      now: CASH,
    });
    assert.equal(d.action, "swap");
    assert.equal(d.from, "SOL");
    assert.equal(d.to, "USDC");
  });

  it("takes profit to USDC when the sleeve is up enough", () => {
    const book = emptyBook(1000);
    book.pair = {
      solQty: 0,
      spyxQty: 0,
      qqqxQty: 0,
      gldxQty: 2,
      usdcQty: 200,
      gldxCostUsd: 400,
      stops: { GLDx: { entryPx: 200, peakPx: 250, stopPx: 210, armed: true } },
    };
    const d = decidePair({
      auto: auto({ cooldownMin: 0, takeProfitPct: 0.12, stopPct: 0.9 }),
      book,
      prices: px(100, 770, 500_000, false, { gldx: 250 }),
      samples: hist(100, 770, 48, { gldx: 200 }),
      study: DEFAULT_STUDY,
      now: CASH,
    });
    assert.equal(d.from, "GLDx");
    assert.equal(d.to, "USDC");
  });

  it("skips stale oracles, thin books, failed quotes, and impact over cap", () => {
    const book = emptyBook(1000);
    book.pair = { solQty: 4, spyxQty: 0.26, qqqxQty: 0.42, gldxQty: 0.65, usdcQty: 200 };
    const base = { auto: auto(), book, samples: hist(), study: DEFAULT_STUDY, now: CASH };
    assert.equal(decidePair({ ...base, prices: px(100, 770, 500_000, true) }).action, "skip");
    assert.match(decidePair({ ...base, prices: px(100, 770, 1_000) }).reason, /thin|liquidity|Sitting/i);
    assert.match(decidePair({ ...base, prices: px(), quoteOk: false, live: true }).reason, /quote/i);
    assert.notEqual(decidePair({ ...base, prices: px(), quoteOk: false }).action, "skip");
    assert.match(decidePair({ ...base, prices: px(), impactPct: 0.05 }).reason, /price too much|impact/i);
  });

  it("flattens to cash on allocated-stack stop", () => {
    const book = emptyBook(1000);
    book.pair = { solQty: 2, spyxQty: 0.2, qqqxQty: 0.2, gldxQty: 0.2, usdcQty: 0 };
    const d = decidePair({
      auto: auto({ stopPct: 0.08 }),
      book,
      prices: px(50, 200),
      samples: hist(100, 770),
      study: DEFAULT_STUDY,
      now: CASH,
    });
    assert.equal(d.action, "flatten");
    assert.equal(d.to, "USDC");
  });

  it("respects cooldown while in USDC", () => {
    const book = emptyBook(1000);
    book.lastTradeAt = CASH - 60_000;
    const d = decidePair({
      auto: auto({ cooldownMin: 15 }),
      book,
      prices: px(118, 770),
      samples: uptrend(),
      study: DEFAULT_STUDY,
      now: CASH,
    });
    assert.equal(d.action, "hold");
    assert.match(d.reason, /Waiting/i);
  });

  it("does not spray USDC across every sleeve on an empty book", () => {
    const book = emptyBook(1000);
    const d = decidePair({
      auto: auto({ cooldownMin: 0 }),
      book,
      prices: px(),
      samples: hist(),
      study: DEFAULT_STUDY,
      now: CASH,
    });
    assert.notEqual(d.action, "deploy");
    if (d.action === "swap") assert.equal(d.from, "USDC");
  });

  it("widens the band after losses — never loosens", () => {
    assert.equal(bumpBand("tight", 0), "tight");
    assert.equal(bumpBand("tight", 2), "normal");
    assert.equal(bumpBand("normal", 2), "wide");
    assert.equal(bumpBand("wide", 8), "wide");
  });
});

describe("paper fills + kill", () => {
  it("buys from USDC then sells back to USDC on a trail", () => {
    const book = emptyBook(1000);
    const prices = px(112, 800, 500_000, false, { qqqx: 520, gldx: 370 });
    const bought = tickPairBook({
      book,
      auto: auto({ cooldownMin: 0 }),
      prices,
      samples: uptrend(100, 770, 64, { qqqx: 480, gldx: 310 }),
      study: DEFAULT_STUDY,
      now: CASH,
    });
    assert.ok(bought.decision.action === "swap" || bought.decision.action === "hold");
    if (bought.decision.action === "swap") {
      assert.equal(bought.decision.from, "USDC");
      assert.ok((book.pair?.usdcQty || 0) < 1000);
    }
    assert.ok(book.equityUsd > 900);

    book.lastTradeAt = undefined;
    book.pair!.lastClipAt = {};
    if (book.pair) {
      book.pair.solQty = 4;
      book.pair.solCostUsd = 400;
      book.pair.stops = { SOL: { entryPx: 100, peakPx: 120, stopPx: 112, armed: true } };
    }
    const high = tickPairBook({
      book,
      auto: auto({ cooldownMin: 0, takeProfitPct: 0.9 }),
      prices: px(110, 770),
      samples: hist(100, 770),
      study: DEFAULT_STUDY,
      now: CASH + 1,
    });
    assert.equal(high.decision.from, "SOL");
    assert.ok(high.fills.length >= 2);
    assert.equal(high.fills[0].strategy, "sol_spyx");
  });

  it("kill switch flattens every sleeve to cash and halts", () => {
    const book = emptyBook(1000);
    book.pair = { solQty: 4, spyxQty: 0.5, qqqxQty: 0.4, gldxQty: 0.3, usdcQty: 10 };
    killBook(book, px(), CASH);
    assert.equal(book.killed, true);
    assert.ok((book.pair?.solQty || 0) < 1e-6);
    assert.ok((book.pair?.spyxQty || 0) < 1e-6);
    assert.ok((book.pair?.qqqxQty || 0) < 1e-6);
    assert.ok((book.pair?.gldxQty || 0) < 1e-6);
    assert.ok((book.pair?.usdcQty || 0) > 100);
    assert.ok((book.haltedUntil || 0) > CASH);
    const d = decidePair({
      auto: auto(),
      book,
      prices: px(),
      samples: hist(),
      study: DEFAULT_STUDY,
      now: CASH,
    });
    assert.equal(d.action, "skip");
    assert.match(d.reason, /Stopped/i);
  });

  it("flatten helper leaves only cash working capital", () => {
    const book = emptyBook(1000);
    book.pair = { solQty: 3, spyxQty: 0.4, qqqxQty: 0.3, gldxQty: 0.2, usdcQty: 50 };
    flattenToUsdc(book, px(), CASH, "test flatten");
    assert.equal(book.pair?.solQty, 0);
    assert.equal(book.pair?.spyxQty, 0);
    assert.equal(book.pair?.qqqxQty, 0);
    assert.equal(book.pair?.gldxQty, 0);
    assert.ok((book.pair?.usdcQty || 0) > 50);
  });

  it("v1 leverage is always 1 and cooldown is 2 minutes", () => {
    assert.equal(DEFAULT_AUTO.leverage, 1);
    assert.equal(DEFAULT_AUTO.mode, "paper");
    assert.equal(DEFAULT_AUTO.style, "mean_revert");
    assert.equal(DEFAULT_AUTO.cooldownMin, 2);
    assert.equal(DEFAULT_AUTO.band, "normal");
  });

  it("does not flood the tape with the same hold", () => {
    const book = emptyBook(1000);
    book.pair = {
      solQty: 4,
      spyxQty: 0.26,
      qqqxQty: 0.42,
      gldxQty: 0.65,
      usdcQty: 200,
      solCostUsd: 400,
      spyxCostUsd: 200,
      qqqxCostUsd: 200,
      gldxCostUsd: 200,
    };
    tickPairBook({
      book,
      auto: auto(),
      prices: px(100, 770),
      samples: hist(100, 770),
      study: DEFAULT_STUDY,
      now: CASH,
    });
    tickPairBook({
      book,
      auto: auto(),
      prices: px(100, 770),
      samples: hist(100, 770),
      study: DEFAULT_STUDY,
      now: CASH + 15_000,
    });
    const holds = (book.tape || []).filter((r) => r.action === "hold");
    assert.equal(holds.length, 1);
    assert.equal(book.skipped || 0, 0);
  });

  it("marks sleeve cost so a SOL move shows unrealized", () => {
    const book = emptyBook(1000);
    book.pair = { solQty: 2, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: 800, solCostUsd: 200 };
    markPair(book, px(110, 770));
    const sol = book.positions.find((p) => p.symbol === "SOL");
    assert.ok(sol);
    assert.ok((sol?.unrealizedUsd || 0) > 0);
  });
});

describe("log-ratio", () => {
  it("R = P_SOL / P_asset", () => {
    assert.ok(Math.abs(logRatio(100, 770) - Math.log(100 / 770)) < 1e-12);
  });
});
