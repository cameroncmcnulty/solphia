import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PAD_SWAP_FEE_BPS, splitPadSpend } from "../lib/swap/pad";
import { SWAP_FEE_BPS, curveSaleCap, emptyCurve, quoteBuy, quoteSell, TOKEN_SUPPLY, CURVE_SALE } from "../lib/launch/curve";
import { pickBestQuote } from "../lib/pair/jupiter";
import { liveClipFeeSol, liveSwapFeeSol, protocolFeeSol } from "../lib/swap/route";
import { clipHoldingUsd, HOLDING_CLIP_MAX } from "../lib/pair/engine";
import { isDeskMint } from "../lib/tx/venue";
import { SOL_MINT, USDC_MINT } from "../lib/pair/mints";
import { padPair } from "../lib/swap/open";
import { launchError } from "../lib/launch/errors";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("pad swap fee", () => {
  it("takes 1% of SOL on the in-house curve, not a Jupiter skim", () => {
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

describe("in-house pad venue", () => {
  it("treats official rails as desk, not pad", () => {
    assert.equal(isDeskMint(SOL_MINT), true);
    assert.equal(isDeskMint(USDC_MINT), true);
    assert.equal(isDeskMint("So1phiaFakeMint111111111111111111111111111"), false);
  });

  it("keeps quoting after the 85 SOL milestone", () => {
    let c = emptyCurve();
    const first = quoteBuy(c, 1);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    c = first.newCurve;
    c.phase = "graduated";
    assert.equal(curveSaleCap(c), TOKEN_SUPPLY);
    assert.ok(curveSaleCap(emptyCurve()) === CURVE_SALE);
    const more = quoteBuy(c, 1);
    assert.equal(more.ok, true);
    if (!more.ok) return;
    assert.equal(more.newCurve.phase, "graduated");
    const sold = quoteSell(more.newCurve, more.tokensOut || 0);
    assert.equal(sold.ok, true);
    if (!sold.ok) return;
    assert.equal(sold.newCurve.phase, "graduated");
  });

  it("explains a mint that is not on our program", () => {
    assert.match(launchError("not_on_curve"), /Solphia curve/);
    assert.match(launchError("desk_mint"), /live desk/);
  });

  it("routes SOL paired with a pad mint onto the curve, anything else off-curve", () => {
    const padMint = "So1phiaFakeMint111111111111111111111111111";
    assert.deepEqual(padPair(SOL_MINT, padMint), { mint: padMint, side: "buy" });
    assert.deepEqual(padPair(padMint, SOL_MINT), { mint: padMint, side: "sell" });
    assert.equal(padPair(USDC_MINT, padMint), null);
    assert.equal(padPair(padMint, USDC_MINT), null);
    assert.equal(padPair(SOL_MINT, SOL_MINT), null);
    assert.equal(padPair("nope", SOL_MINT), null);
  });
});

describe("open market swap fees", () => {
  it("skims 1% SOL to treasury on the native swap path", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/swap/open.ts"), "utf8");
    assert.match(src, /assemblePhantomSwapTx/);
    assert.equal(/assembleSwapTx/.test(src), false);
    assert.match(src, /liveSwapFeeSol/);
    const phantom = readFileSync(path.join(process.cwd(), "src/lib/swap/build.ts"), "utf8");
    assert.match(phantom, /assemblePhantomSwapTx/);
    assert.match(phantom, /mode: "even"/);
    assert.equal(phantom.includes("if (packed !== built.transaction)"), false);
    const swapBuild = readFileSync(path.join(process.cwd(), "src/app/api/swap/build/route.ts"), "utf8");
    assert.match(swapBuild, /creditSwapHold/);
    assert.match(src, /Not enough SOL in this wallet/);
    assert.equal(liveSwapFeeSol(1), 0.01);
    assert.equal(liveSwapFeeSol(0.015), 0.00015);
    assert.match(phantom, /houseFeeMissing/);
    const pair = readFileSync(path.join(process.cwd(), "src/app/api/pair/swap/route.ts"), "utf8");
    assert.match(pair, /assembleSwapTx/);
    assert.equal(/assemblePhantomSwapTx/.test(pair), false);
    const widget = readFileSync(path.join(process.cwd(), "src/components/SwapWidget.tsx"), "utf8");
    assert.equal(widget.includes('useState("0.25")'), false);
    assert.match(widget, /id=\{widgetId\}/);
    assert.match(widget, /function clearPayAmount/);
    assert.match(widget, /notice\?\.at/);
    assert.match(widget, /maxPayString\(spendable/);
    assert.equal(/setAmount\(payIsSol \? fmtSol/.test(widget), false);
    assert.equal(widget.includes('defaultSymbol || "TOKEN"'), false);
    assert.equal(widget.includes("symbol: liveLabel(next.symbol"), false);
    assert.match(widget, /isPlaceholderLabel/);
    const launch = readFileSync(path.join(process.cwd(), "src/app/launch/page.tsx"), "utf8");
    assert.equal(launch.includes("function MarketSwap"), false);
    assert.match(launch, /<SwapWidget/);
    const lookup = readFileSync(path.join(process.cwd(), "src/app/api/launch/lookup/route.ts"), "utf8");
    assert.match(lookup, /isPlaceholderLabel/);
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

  it("skims 10 bps of the paper mark and 1% of live SOL to treasury", () => {
    assert.equal(protocolFeeSol(1000, 100), 0.01);
    assert.equal(liveSwapFeeSol(1), 0.01);
    assert.equal(liveClipFeeSol(100, 100), 0.01);
    const take = clipHoldingUsd(400);
    assert.ok(take <= 400 * HOLDING_CLIP_MAX + 1e-9);
    assert.ok(take < 400);
  });
});
