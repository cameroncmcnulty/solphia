import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOKEN_SUPPLY } from "../lib/launch/curve";
import { PAD_PROGRAM_ID } from "../lib/launch/ids";
import { quoteBuyRaw, quoteSellRaw } from "../lib/launch/program";
import { storedImage } from "../lib/launch/validate";
import { createCoin, emptyLaunchBook, publicCoin, recordOnchainFill } from "../lib/launch/engine";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";

describe("pad on-chain mint", () => {
  it("points at the mainnet Solphia pad program", () => {
    assert.equal(PAD_PROGRAM_ID, "5s26ZJDhyErFMx3ELo9CYXS3Y5BcwZvQ5EceYq8WFv4d");
  });
  it("matches Pump.fun 1B supply at 6 decimals without minting into the creator", () => {
    assert.equal(TOKEN_SUPPLY, 1_000_000_000);
    const book = emptyLaunchBook();
    const mint = "So11111111111111111111111111111111111111112";
    const r = createCoin(book, {
      creator: A,
      name: "Pump Fox",
      symbol: "PFOX",
      mint,
      venue: "solphia",
      launchBuySol: 0.4,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.coin.venue, "solphia");
    assert.equal(r.coin.holders[A], undefined);
    assert.equal(r.coin.curve.tokensSold, 0);
    assert.equal(publicCoin(r.coin).venue, "solphia");
  });

  it("tapes an on-chain first buy without moving the curve book", () => {
    const book = emptyLaunchBook();
    const mint = "So11111111111111111111111111111111111111112";
    const r = createCoin(book, { creator: A, name: "Pump Fox", symbol: "PFO2", mint, venue: "solphia" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const fill = recordOnchainFill(book, { id: r.coin.id, owner: A, side: "buy", sol: 0.4, tokens: 12_000_000, feeSol: 0.004 });
    assert.equal(fill.ok, true);
    if (!fill.ok) return;
    assert.equal(fill.coin.holders[A]?.tokens, 12_000_000);
    assert.equal(fill.coin.curve.tokensSold, 0);
    assert.equal(fill.fill.feeSol, 0.004);
    assert.equal(book.treasuryFeesSol, 0.001);
  });

  it("takes 1% in integer math and never sends supply to the buyer on quote", () => {
    const vs = 30n * 1_000_000_000n;
    const vt = 1_073_000_191n * 1_000_000n;
    const buy = quoteBuyRaw(vs, vt, 1_000_000_000n);
    assert.equal(buy.fee, 10_000_000n);
    assert.equal(buy.net, 990_000_000n);
    assert.ok(buy.tokensOut > 0n);
    assert.ok(buy.tokensOut < 800_000_000n * 1_000_000n);
    const sell = quoteSellRaw(vs + buy.net, vt - buy.tokensOut, buy.tokensOut);
    assert.ok(sell.solOut < buy.net);
    assert.ok(sell.fee > 0n);
  });

  it("accepts pinned https art after Phantom mint", () => {
    assert.equal(storedImage("https://gateway.pinata.cloud/ipfs/abc"), "https://gateway.pinata.cloud/ipfs/abc");
    assert.equal(storedImage("http://evil.example/x.png"), "");
    assert.equal(storedImage(""), "");
  });
});
