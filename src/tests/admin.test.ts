import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { PNG } from "pngjs";
import { bookHoldingUsd, sumWindows, windowClip } from "../lib/admin/stats";
import { buildPlatformSnapshot, userWalletsOf } from "../lib/admin/platform";
import { emptyCurve } from "../lib/launch/curve";
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

const WALLET_A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const WALLET_B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";

describe("platform snapshot", () => {
  it("counts pad TVL, 24h volume, users, and on-chain wallet SOL", () => {
    const s = emptyState();
    const now = Date.parse("2026-10-06T12:00:00Z");
    s.users = [{ pubkey: WALLET_A, createdAt: now - 1000, lastSeen: now - 1000, alertsEnabled: true }];
    s.accounts = [
      {
        id: "acct1",
        email: "a@b.com",
        emailNorm: "a@b.com",
        wallets: [WALLET_B],
        createdAt: now - 2000,
        lastSeen: now - 500,
      },
    ];
    s.launch = {
      ...s.launch!,
      coins: [
        {
          id: "c1",
          mint: WALLET_B,
          name: "Bag",
          symbol: "BAG",
          blurb: "",
          links: {},
          mintAuthority: "revoked",
          freezeAuthority: "revoked",
          creator: WALLET_A,
          createdAt: now - 10_000,
          curve: { ...emptyCurve(), realSol: 12.5 },
          status: "curve",
          holders: {},
          fills: [
            { id: "f1", at: now - 1000, owner: WALLET_A, side: "buy", sol: 1.25, tokens: 1000, feeSol: 0.0125, priceSol: 0.001 },
            { id: "f2", at: now - 3 * 86_400_000, owner: WALLET_B, side: "sell", sol: 9, tokens: 1000, feeSol: 0.09, priceSol: 0.001 },
          ],
          devRewardsSol: 0,
          ownerFeesSol: 0,
          treasuryFeesSol: 0,
          referralFeesSol: 0,
        },
      ],
      accounts: { [WALLET_A]: { pubkey: WALLET_A, referralRewardsSol: 0, xp: 10 } },
    };
    const snap = buildPlatformSnapshot(s, now, { solUsd: 200, spyxUsd: 0, qqqxUsd: 0, gldxUsd: 0 });
    assert.equal(snap.padTvlSol, 12.5);
    assert.equal(snap.padVolSol24h, 1.25);
    assert.equal(snap.padTxns24h, 1);
    assert.equal(snap.padTraders24h, 1);
    assert.equal(snap.liveLaunches, 1);
    assert.equal(snap.launches, 1);
    assert.ok(userWalletsOf(s).includes(WALLET_A));
    assert.ok(userWalletsOf(s).includes(WALLET_B));
    assert.ok(snap.active24h >= 1);
    assert.equal(snap.ranked, 1);
    assert.equal(snap.assetsUsd, 2500);
    const withChain = buildPlatformSnapshot(s, now, { solUsd: 200, spyxUsd: 0, qqqxUsd: 0, gldxUsd: 0 }, {
      userSol: 3,
      protocolSol: 1,
      sampled: 2,
    });
    assert.equal(withChain.userWalletSol, 3);
    assert.equal(withChain.protocolSol, 1);
    assert.equal(withChain.assetsUsd, 3300);
    const overview = fs.readFileSync(path.join(process.cwd(), "src/components/admin/sections/Overview.tsx"), "utf8");
    assert.match(overview, /PLATFORM · SPONSOR SNAPSHOT/);
    assert.match(overview, /SOL in wallets/);
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
