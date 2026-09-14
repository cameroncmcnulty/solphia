import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buyCoin, createCoin, emptyLaunchBook, publicCoin } from "../lib/launch/engine";
import { auditLaunchCoin, rankTape } from "../lib/launch/audit";
import { filterTape, sortTape, volumeIn } from "../lib/launch/tape";
import { marketPasses, MARKET_MIN_SCORE, filterMarketSnapshots, snapshotToTape } from "../lib/launch/market";
import { isNativeSolSnapshot, WSOL_MINT } from "../lib/feeds/normalize";
import type { TokenSnapshot } from "../lib/types";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const C = "2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma";

const NOW = 1_700_000_000_000;

function pub(symbol: string, createdAt: number, buys: { owner: string; sol: number; at: number }[] = [], extra?: { x?: string; telegram?: string; website?: string; discord?: string; blurb?: string; name?: string }) {
  const book = emptyLaunchBook();
  const made = createCoin(book, {
    creator: A,
    name: extra?.name || symbol + " Coin",
    symbol,
    blurb: extra?.blurb || "fair launch with a real one-liner about the tape",
    x: extra?.x,
    telegram: extra?.telegram,
    website: extra?.website,
    discord: extra?.discord,
    now: createdAt,
  });
  assert.equal(made.ok, true);
  if (!made.ok) throw new Error("create");
  for (const b of buys) {
    const r = buyCoin(book, { id: made.coin.id, owner: b.owner, sol: b.sol, now: b.at, skipSnipe: true });
    assert.equal(r.ok, true, r.ok ? "" : r.error);
  }
  return publicCoin(made.coin, 150, A, book, NOW);
}

describe("launch tape windows", () => {
  it("filters by 1h / 6h / 24h created-at and newest keeps all", () => {
    const fresh = pub("NEW1", NOW - 10 * 60_000);
    const hour = pub("HR6X", NOW - 3 * 60 * 60_000);
    const day = pub("DAYX", NOW - 20 * 60 * 60_000);
    const old = pub("OLDX", NOW - 48 * 60 * 60_000);
    const all = [fresh, hour, day, old];
    assert.equal(filterTape(all, "1h", NOW).map((c) => c.symbol).join(), "NEW1");
    assert.deepEqual(filterTape(all, "6h", NOW).map((c) => c.symbol), ["NEW1", "HR6X"]);
    assert.equal(filterTape(all, "24h", NOW).length, 3);
    assert.equal(filterTape(all, "newest", NOW).length, 4);
  });

  it("sorts by highest volume in the selected window", () => {
    const quiet = pub("QTXX", NOW - 40 * 60_000, [{ owner: B, sol: 0.05, at: NOW - 2 * 60_000 }]);
    const loud5 = pub("LOUD", NOW - 40 * 60_000, [{ owner: B, sol: 0.8, at: NOW - 2 * 60_000 }]);
    const loudHour = pub("HRVL", NOW - 40 * 60_000, [{ owner: C, sol: 0.9, at: NOW - 50 * 60_000 }]);
    const rows = sortTape([quiet, loud5, loudHour], "5m", NOW);
    assert.equal(rows[0].symbol, "LOUD");
    assert.ok(volumeIn(loud5, "5m", NOW) > volumeIn(quiet, "5m", NOW));
    const hour = sortTape([quiet, loud5, loudHour], "1h", NOW);
    assert.equal(hour[0].symbol, "HRVL");
  });
});

describe("launch tape audit rank", () => {
  it("ranks a built-out social coin above a naked throwaway and fills only the board", () => {
    const built = pub(
      "BUILT",
      NOW - 12 * 60_000,
      [
        { owner: B, sol: 0.4, at: NOW - 8 * 60_000 },
        { owner: C, sol: 0.35, at: NOW - 7 * 60_000 },
      ],
      {
        x: "builtcoin",
        telegram: "builtcoin",
        website: "https://built.example",
        discord: "builtcoin",
        blurb: "A real project with a telegram, site, and discord for holders.",
        name: "Built Labs",
      },
    );
    const naked = pub("NAKED", NOW - 8 * 60_000, [], { name: "xx", blurb: "" });
    const board = rankTape([naked, built], 150, NOW);
    assert.equal(board.length, 2);
    assert.equal(board[0].coin.symbol, "BUILT");
    assert.equal(board[0].rank, 1);
    assert.ok(board[0].audit.score > board[1].audit.score);
    assert.ok(board[0].audit.socials >= 3);
    assert.ok(board[0].audit.factors.some((f) => f.id === "tg" || f.id === "stack"));
  });

  it("penalizes copycat tickers and factory deployers in the audit", () => {
    const copy = pub("SPHA", NOW - 5 * 60_000, [], { name: "Solphia Clone", blurb: "totally original" });
    const a = auditLaunchCoin(copy, 150, NOW);
    assert.ok(a.factors.some((f) => f.id === "copy"));
    assert.ok(a.score < 70);
  });

  it("uses the risk engine authorities bonus because mint and freeze are locked", () => {
    const c = pub("LOCK", NOW - 6 * 60_000, [{ owner: B, sol: 0.3, at: NOW - 4 * 60_000 }], {
      telegram: "lockcoin",
      x: "lockcoin",
      blurb: "Mint and freeze stay revoked on this pad.",
      name: "Lock Coin",
    });
    const a = auditLaunchCoin(c, 150, NOW);
    assert.ok(a.factors.some((f) => f.id === "mint"));
    assert.ok(a.factors.some((f) => f.id === "freeze"));
  });
});

describe("market tape gate", () => {
  it("lets Solphia-born through, cuts NSFW/dust, and prefers 45+ without starving the board", () => {
    assert.equal(MARKET_MIN_SCORE, 45);
    assert.equal(marketPasses({ born: true, score: 12, vetoed: true }), true);
    assert.equal(marketPasses({ score: 80, marketCapUsd: 50_000, liquidityUsd: 10_000 }), true);
    assert.equal(marketPasses({ score: 50, marketCapUsd: 50_000, liquidityUsd: 10_000, preferred: true }), true);
    assert.equal(marketPasses({ score: 30, marketCapUsd: 50_000, preferred: true }), false);
    assert.equal(marketPasses({ score: 30, marketCapUsd: 50_000 }), true);
    assert.equal(marketPasses({ score: 90, nsfw: true, marketCapUsd: 50_000 }), false);
    assert.equal(marketPasses({ score: 90, marketCapUsd: 10, liquidityUsd: 10, volume1hUsd: 10 }), false);
  });

  it("drops native SOL and ticker-SOL stubs so the tape is not a wall of $SOL", () => {
    assert.equal(isNativeSolSnapshot({ mint: WSOL_MINT, symbol: "BONK", name: "Bonk" }), true);
    assert.equal(isNativeSolSnapshot({ mint: "FbLaAw9wxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", symbol: "SOL", name: "Solana" }), true);
    assert.equal(isNativeSolSnapshot({ mint: "9yP2ZT8kxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", symbol: "SOL", name: "Sexy Older Ladies" }), true);
    assert.equal(isNativeSolSnapshot({ mint: "PepeMintxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", symbol: "PEPE", name: "Pepe" }), false);
    const stub = {
      venue: "raydium",
      createdAt: NOW,
      priceUsd: 1,
      volume5m: 0,
      volume24h: 0,
      txns5m: 0,
      txns1h: 0,
      buys1h: 0,
      sells1h: 0,
      uniqueTraders1h: 0,
      priceChange5m: 0,
      priceChange1h: 0,
      priceChange6h: 0,
      priceChange24h: 0,
      bondingProgress: 1,
      graduated: true,
      replyCount: 0,
      verified: false,
      socials: {},
    };
    const tokens = [
      {
        ...stub,
        mint: WSOL_MINT,
        name: "Solana",
        symbol: "SOL",
        marketCapUsd: 1_000_000,
        liquidityUsd: 50_000,
        volume1h: 10_000,
        nsfw: false,
        banned: false,
        livestream: false,
      },
      {
        ...stub,
        mint: "PepeMintxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1",
        name: "Pepe",
        symbol: "PEPE",
        marketCapUsd: 80_000,
        liquidityUsd: 12_000,
        volume1h: 4_000,
        nsfw: false,
        banned: false,
        livestream: false,
      },
    ] as TokenSnapshot[];
    const { rows } = filterMarketSnapshots(tokens, 150);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].coin.symbol, "PEPE");
  });

  it("still builds a tape row for a searched mint that would fail the public gate", () => {
    const dust: TokenSnapshot = {
      mint: "DustMintxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1",
      name: "Dust Coin",
      symbol: "DUST",
      venue: "pumpfun",
      createdAt: NOW,
      priceUsd: 0.0001,
      marketCapUsd: 10,
      liquidityUsd: 5,
      volume5m: 0,
      volume1h: 1,
      volume24h: 2,
      txns5m: 0,
      txns1h: 1,
      buys1h: 1,
      sells1h: 0,
      uniqueTraders1h: 1,
      priceChange5m: 0,
      priceChange1h: 0,
      priceChange6h: 0,
      priceChange24h: 0,
      bondingProgress: 0.1,
      graduated: false,
      nsfw: false,
      banned: false,
      livestream: false,
      replyCount: 0,
      verified: false,
      socials: {},
    };
    assert.equal(marketPasses({ score: 90, marketCapUsd: 10, liquidityUsd: 5, volume1hUsd: 1 }), false);
    const row = snapshotToTape(dust, 150);
    assert.equal(row.mint, dust.mint);
    assert.equal(row.symbol, "DUST");
    assert.equal(row.born, false);
  });
});
