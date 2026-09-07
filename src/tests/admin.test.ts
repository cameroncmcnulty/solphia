import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { PNG } from "pngjs";
import { bookHoldingUsd, sumWindows, windowClip } from "../lib/admin/stats";
import { prunePromos, PROMO_CAP } from "../lib/admin/promo";
import { localPack } from "../lib/content/copy";
import { coverBlit, loadPng } from "../lib/content/crop";
import { emptyBook } from "../lib/auto";
import { emptyState } from "../lib/store";
import type { PromoItem } from "../lib/types";

describe("admin stats", () => {
  it("sums fill volume inside 24h", () => {
    const book = emptyBook(1000);
    const now = Date.now();
    book.fills = [
      {
        id: "a",
        mint: "x",
        symbol: "SOL",
        name: "SOL",
        strategy: "sol_spyx",
        side: "buy",
        at: now - 1000,
        priceUsd: 100,
        qty: 1,
        sizeUsd: 40,
        feeUsd: 0.04,
        slippageUsd: 0,
        riskScore: 90,
        venue: "stable",
        reason: "clip",
      },
      {
        id: "b",
        mint: "x",
        symbol: "SOL",
        name: "SOL",
        strategy: "sol_spyx",
        side: "sell",
        at: now - 3 * 86_400_000,
        priceUsd: 100,
        qty: 1,
        sizeUsd: 80,
        feeUsd: 0.08,
        slippageUsd: 0,
        pnlUsd: 2,
        riskScore: 90,
        venue: "stable",
        reason: "clip",
      },
    ];
    const w = windowClip(book, now - 86_400_000);
    assert.equal(w.volumeUsd, 40);
    assert.equal(w.trades, 1);
    const both = sumWindows([book], now);
    assert.equal(both.h24.volumeUsd, 40);
    assert.equal(both.d7.volumeUsd, 120);
    assert.equal(both.d30.volumeUsd, 120);
  });

  it("marks sleeve holding in USDC", () => {
    const book = emptyBook(1000);
    book.pair = { solQty: 2, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: 100 };
    const v = bookHoldingUsd(book, { solUsd: 150, spyxUsd: 1, qqqxUsd: 1, gldxUsd: 1 });
    assert.equal(v, 400);
  });
});

describe("promo cap", () => {
  it("drops oldest past 24", () => {
    const s = emptyState();
    s.promos = Array.from({ length: 26 }, (_, i) => ({
      id: `p${i}`,
      at: i,
      kind: "image",
      aspect: "1:1",
      headline: "h",
      caption: "c",
      pnlLabel: "+1%",
      prompt: "p",
      mime: "image/jpeg",
    })) as PromoItem[];
    prunePromos(s);
    assert.equal(s.promos?.length, PROMO_CAP);
    assert.equal(s.promos?.[0].id, "p2");
  });
});

describe("content bot", () => {
  it("writes a mixed in-house pack with solphia.io and no memecoins", () => {
    const shots = localPack(1_700_000_000_000, "");
    assert.equal(shots.length, 4);
    const layouts = new Set(shots.map((s) => s.layout));
    assert.ok(layouts.size >= 3);
    for (const s of shots) {
      assert.match(s.caption, /solphia\.io/i);
      assert.match(s.caption, /illustrative/i);
      assert.match(s.caption, /No memecoins/);
      assert.ok(s.headline.length > 4);
      assert.ok(s.candles.length > 8);
      assert.equal(s.sleeves.length, 5);
      assert.ok(s.art.compose);
      assert.ok(s.art.asset);
      assert.ok(s.art.fit === "cover" || s.art.fit === "left" || s.art.fit === "right");
      assert.notEqual(s.art.asset, "solphia-head.png");
    }
    const composes = new Set(shots.map((s) => s.art.compose));
    assert.ok(composes.size >= 2);
  });

  it("builds a tape shot with candles when asked for charts", () => {
    const shots = localPack(99, "candlestick pnl");
    assert.ok(shots.some((s) => s.layout === "tape" || s.layout === "curve" || s.layout === "split"));
  });

  it("leans gold when asked", () => {
    const shots = localPack(42, "gold this week");
    assert.ok(shots.some((s) => /gold/i.test(s.headline + s.caption)));
  });

  it("cover-crops the face with uniform scale — no stretch", () => {
    const face = path.join(process.cwd(), "public", "solphia-face.png");
    assert.equal(fs.existsSync(face), true);
    const src = loadPng("solphia-face.png");
    assert.equal(src.width, 864);
    assert.equal(src.height, 1152);
    const dest = new PNG({ width: 864, height: 864, colorType: 6 });
    const { scale } = coverBlit(src, dest, { x: 0, y: 0, w: 864, h: 864 }, 50, 8);
    assert.equal(scale, 1);
    const oy = Math.round(0.08 * (1152 - 864));
    const sx = 120;
    const sy = 80;
    const si = (sy * src.width + sx) * 4;
    const di = ((sy - oy) * dest.width + sx) * 4;
    if (sy >= oy) {
      assert.ok(Math.abs(dest.data[di] - src.data[si]) < 8);
      assert.ok(Math.abs(dest.data[di + 1] - src.data[si + 1]) < 8);
    }
  });
});
