import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PAD_DECIMALS, PAD_SUPPLY, padRawAmount } from "../lib/launch/onchain";
import { TOKEN_SUPPLY } from "../lib/launch/curve";
import { storedImage } from "../lib/launch/validate";

describe("pad on-chain mint", () => {
  it("mints 1B tokens at 6 decimals", () => {
    assert.equal(PAD_DECIMALS, 6);
    assert.equal(PAD_SUPPLY, TOKEN_SUPPLY);
    assert.equal(padRawAmount(1, 6), 1_000_000n);
    assert.equal(padRawAmount(PAD_SUPPLY, PAD_DECIMALS), 1_000_000_000_000_000n);
  });

  it("accepts pinned https art after Phantom mint", () => {
    assert.equal(storedImage("https://gateway.pinata.cloud/ipfs/abc"), "https://gateway.pinata.cloud/ipfs/abc");
    assert.equal(storedImage("http://evil.example/x.png"), "");
    assert.equal(storedImage(""), "");
  });
});
