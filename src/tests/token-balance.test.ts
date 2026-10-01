import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sumTokenUiAmount } from "../lib/solana/tokenBalance";
import { swapSimReason } from "../lib/solana/simulate";
import { USDC_MINT } from "../lib/pair/mints";

const ATA = "FjNMY9bd53P2eBvpRSpnprX3ym7R2Ad6Jp4TK2fAYkT4";
const OTHER = "9HdXd47EUz5SaGckw3rPFYkVmjoSSWKWnjkWU6DdQSvL";

describe("token balance", () => {
  it("does not double a USDC account returned by both token programs", () => {
    const row = { pubkey: ATA, mint: USDC_MINT, uiAmount: 29.25, decimals: 6 };
    const sum = sumTokenUiAmount([row, { ...row }], USDC_MINT);
    assert.equal(sum.amount, 29.25);
    assert.equal(sum.decimals, 6);
  });

  it("adds two different accounts of the same mint", () => {
    const sum = sumTokenUiAmount(
      [
        { pubkey: ATA, mint: USDC_MINT, uiAmount: 10, decimals: 6 },
        { pubkey: OTHER, mint: USDC_MINT, uiAmount: 19.25, decimals: 6 },
      ],
      USDC_MINT,
    );
    assert.equal(sum.amount, 29.25);
  });

  it("ignores other mints when summing one mint", () => {
    const sum = sumTokenUiAmount(
      [
        { pubkey: ATA, mint: USDC_MINT, uiAmount: 29.25, decimals: 6 },
        { pubkey: OTHER, mint: "So11111111111111111111111111111111111111112", uiAmount: 99, decimals: 9 },
      ],
      USDC_MINT,
    );
    assert.equal(sum.amount, 29.25);
  });
});

describe("swap sim copy", () => {
  it("turns Jupiter 0x1788 into a short-bag message, not a Phantom warning", () => {
    const msg = swapSimReason({ InstructionError: [3, { Custom: 6024 }] }, [
      "Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 failed: custom program error: 0x1788",
    ]);
    assert.match(msg, /Not enough of that token/);
    assert.doesNotMatch(msg, /malicious/i);
  });
});
