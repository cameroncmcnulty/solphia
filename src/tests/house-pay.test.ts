import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchHouseTransfers } from "../lib/solana/connection";

const FROM = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const TO1 = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const TO2 = "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj";

const LEGS = [
  { to: TO1, lamports: 50_000_000 },
  { to: TO2, lamports: 50_000_000 },
];

function ix(source: string, destination: string, lamports: number) {
  return { parsed: { type: "transfer", info: { source, destination, lamports } } };
}

describe("house pin payment parse", () => {
  it("matches top-level SOL transfers", () => {
    const out = matchHouseTransfers(
      {
        meta: { err: null },
        transaction: { message: { instructions: [ix(FROM, TO1, 50_000_000), ix(FROM, TO2, 50_000_000)], accountKeys: [] } },
      },
      FROM,
      LEGS,
    );
    assert.equal(out.ok, true);
  });

  it("matches inner instruction transfers used by versioned txs", () => {
    const out = matchHouseTransfers(
      {
        meta: {
          err: null,
          innerInstructions: [{ instructions: [ix(FROM, TO1, 50_000_000), ix(FROM, TO2, 50_000_000)] }],
        },
        transaction: { message: { instructions: [{ programId: "ComputeBudget111111111111111111111111111111" }], accountKeys: [] } },
      },
      FROM,
      LEGS,
    );
    assert.equal(out.ok, true);
  });

  it("falls back to pre/post balance deltas when parsed ixs are wrapped", () => {
    const out = matchHouseTransfers(
      {
        meta: {
          err: null,
          preBalances: [200_000_000, 1_000_000, 1_000_000],
          postBalances: [100_000_000, 51_000_000, 51_000_000],
        },
        transaction: {
          message: {
            instructions: [{ programId: "ComputeBudget111111111111111111111111111111" }],
            accountKeys: [{ toBase58: () => FROM }, { pubkey: { toBase58: () => TO1 } }, TO2],
          },
        },
      },
      FROM,
      LEGS,
    );
    assert.equal(out.ok, true);
  });

  it("rejects a failed on-chain tx", () => {
    const out = matchHouseTransfers(
      {
        meta: { err: { InstructionError: [0, "Custom"] } },
        transaction: { message: { instructions: [ix(FROM, TO1, 50_000_000)], accountKeys: [] } },
      },
      FROM,
      LEGS,
    );
    assert.equal(out.ok, false);
    assert.equal(out.error, "Transaction failed on-chain.");
  });
});
