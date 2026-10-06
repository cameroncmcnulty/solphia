import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SOL_MINT, USDC_MINT } from "../lib/pair/mints";
import { swapComplementMint, swapDefaultPair } from "../lib/swap/pair";

const TOKEN = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

describe("swap pair", () => {
  it("never pairs a mint with itself", () => {
    assert.equal(swapComplementMint(SOL_MINT), USDC_MINT);
    assert.equal(swapComplementMint(USDC_MINT), SOL_MINT);
    assert.equal(swapComplementMint(TOKEN), SOL_MINT);
    const empty = swapDefaultPair();
    assert.equal(empty.pay, SOL_MINT);
    assert.equal(empty.recv, USDC_MINT);
    assert.notEqual(empty.pay, empty.recv);
    const buySol = swapDefaultPair(SOL_MINT, "buy");
    assert.equal(buySol.pay, USDC_MINT);
    assert.equal(buySol.recv, SOL_MINT);
    const sellSol = swapDefaultPair(SOL_MINT, "sell");
    assert.equal(sellSol.pay, SOL_MINT);
    assert.equal(sellSol.recv, USDC_MINT);
    const buyTok = swapDefaultPair(TOKEN, "buy");
    assert.equal(buyTok.pay, SOL_MINT);
    assert.equal(buyTok.recv, TOKEN);
    const sellTok = swapDefaultPair(TOKEN, "sell");
    assert.equal(sellTok.pay, TOKEN);
    assert.equal(sellTok.recv, SOL_MINT);
    for (const p of [empty, buySol, sellSol, buyTok, sellTok, swapDefaultPair(USDC_MINT, "buy"), swapDefaultPair(USDC_MINT, "sell")]) {
      assert.notEqual(p.pay, p.recv);
    }
  });
});
