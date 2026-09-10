import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buyCoin, createCoin, emptyLaunchBook, publicCoin } from "../lib/launch/engine";
import { auditLaunchCoin, rankTape } from "../lib/launch/audit";
import { TAPE_BOARD, filterTape, sortTape, volumeIn } from "../lib/launch/tape";
import { marketPasses, MARKET_MIN_SCORE } from "../lib/launch/market";

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
    const board = rankTape([naked, built], 150, NOW, TAPE_BOARD);
    assert.ok(board.length <= TAPE_BOARD);
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
  it("lets Solphia-born through even with a junk score, and requires 65+ for the rest of the market", () => {
    assert.equal(MARKET_MIN_SCORE, 65);
    assert.equal(marketPasses({ born: true, score: 12, vetoed: true }), true);
    assert.equal(marketPasses({ score: 80, marketCapUsd: 50_000, liquidityUsd: 10_000 }), true);
    assert.equal(marketPasses({ score: 50, marketCapUsd: 50_000, liquidityUsd: 10_000 }), false);
    assert.equal(marketPasses({ score: 90, vetoed: true, marketCapUsd: 50_000 }), false);
    assert.equal(marketPasses({ score: 90, nsfw: true, marketCapUsd: 50_000 }), false);
    assert.equal(marketPasses({ score: 90, marketCapUsd: 100, liquidityUsd: 100 }), false);
  });
});
