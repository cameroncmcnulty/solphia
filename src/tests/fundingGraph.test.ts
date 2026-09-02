import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dumpSignal, type EnhancedTx } from "../lib/desk/fundingGraph";
import { flattenNow } from "../lib/desk/rugClock";
import { blankSnapshot } from "../lib/feeds/normalize";

const C = "Creator111111111111111111111111111111111111";
const W = "Wallet1111111111111111111111111111111111111";
const POOL = "Pool11111111111111111111111111111111111111";
const MINT = "Mint111111111111111111111111111111111111111";

function tx(over: Partial<EnhancedTx> & Pick<EnhancedTx, "slot">): EnhancedTx {
  return { nativeTransfers: [], tokenTransfers: [], ...over };
}

describe("Helius funding graph", () => {
  it("does not treat sale proceeds as funding", () => {
    const sell: EnhancedTx = tx({
      slot: 50,
      signature: "sell",
      nativeTransfers: [{ fromUserAccount: POOL, toUserAccount: W, amount: 2e9 }],
      tokenTransfers: [{ fromUserAccount: W, toUserAccount: POOL, mint: MINT, tokenAmount: 1000 }],
    });
    const r = dumpSignal({ mint: MINT, creator: C, txs: [sell] });
    assert.equal(r.flatten, false, r.reason);
  });

  it("flattens same-slot deployer fund then sell", () => {
    const fund = tx({
      slot: 80,
      signature: "fund",
      nativeTransfers: [{ fromUserAccount: C, toUserAccount: W, amount: 5e8 }],
    });
    const sell = tx({
      slot: 80,
      signature: "sell",
      tokenTransfers: [{ fromUserAccount: W, toUserAccount: POOL, mint: MINT, tokenAmount: 900 }],
    });
    const r = dumpSignal({ mint: MINT, creator: C, txs: [fund, sell] });
    assert.equal(r.flatten, true);
    assert.equal(r.reason, "same-block-dump");
  });

  it("flattens a deployer-funded sell in the next minute of slots", () => {
    const fund = tx({
      slot: 100,
      signature: "fund",
      nativeTransfers: [{ fromUserAccount: C, toUserAccount: W, amount: 4e8 }],
    });
    const sell = tx({
      slot: 240,
      signature: "sell",
      tokenTransfers: [{ fromUserAccount: W, toUserAccount: POOL, mint: MINT, tokenAmount: 900 }],
    });
    const r = dumpSignal({ mint: MINT, creator: C, txs: [fund, sell] });
    assert.equal(r.flatten, true);
    assert.equal(r.reason, "deployer-funded-dump");
  });

  it("does not flatten a sell far after the fund", () => {
    const fund = tx({
      slot: 100,
      signature: "fund",
      nativeTransfers: [{ fromUserAccount: C, toUserAccount: W, amount: 4e8 }],
    });
    const sell = tx({
      slot: 100 + 400,
      signature: "sell",
      tokenTransfers: [{ fromUserAccount: W, toUserAccount: POOL, mint: MINT, tokenAmount: 900 }],
    });
    const r = dumpSignal({ mint: MINT, creator: C, txs: [fund, sell] });
    assert.equal(r.flatten, false);
  });

  it("marks the token so the exit agent flattens now", () => {
    const t = blankSnapshot({
      mint: MINT,
      name: "Dump",
      symbol: "DMP",
      fundingDump: true,
    });
    const f = flattenNow(t);
    assert.equal(f.flatten, true);
    assert.equal(f.reason, "same-block-dump");
  });
});
