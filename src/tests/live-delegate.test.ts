import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Keypair } from "@solana/web3.js";
import { lockedAuto } from "../lib/auto";
import { decryptBytes, encryptBytes, secretFromB64, signerKey } from "../lib/live/crypto";
import { decisionFromIntent } from "../lib/live/fill";
import { planIntentSwaps } from "../lib/live/intent";
import { SOL_MINT, USDC_MINT, xstockMint } from "../lib/pair/mints";
import type { PairIntent } from "../lib/types";

function b64Secret(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

describe("delegated signer crypto", () => {
  it("round-trips a 64-byte trading secret", () => {
    const key = signerKey("test-live-signer");
    const kp = Keypair.generate();
    const blob = encryptBytes(kp.secretKey, key);
    const out = decryptBytes(blob, key);
    assert.equal(out.length, 64);
    assert.deepEqual(Buffer.from(out), Buffer.from(kp.secretKey));
  });

  it("rejects a tampered blob", () => {
    const key = signerKey("test-live-signer");
    const kp = Keypair.generate();
    const blob = encryptBytes(kp.secretKey, key);
    blob.ct = Buffer.from(blob.ct, "base64").subarray(1).toString("base64");
    assert.throws(() => decryptBytes(blob, key));
  });

  it("parses the same backup encoding as exportSecret", () => {
    const kp = Keypair.generate();
    const parsed = secretFromB64(b64Secret(kp.secretKey));
    assert.equal(parsed.length, 64);
    assert.throws(() => secretFromB64("aaaa"));
  });
});

describe("live intent legs", () => {
  const px = { solUsd: 100, spyxUsd: 500, qqqxUsd: 400, gldxUsd: 300 };

  it("swaps SOL to SPYx on a clip", () => {
    const intent: PairIntent = {
      action: "swap",
      from: "SOL",
      to: "SPYx",
      clipUsd: 50,
      reason: "mean revert",
      at: 1,
    };
    const legs = planIntentSwaps({ intent, ...px });
    assert.equal(legs.length, 1);
    assert.equal(legs[0].inputMint, SOL_MINT);
    assert.equal(legs[0].outputMint, xstockMint("spyx"));
    assert.ok(Math.abs(legs[0].amount - 0.5) < 1e-9);
  });

  it("flattens xStocks and USDC back to SOL", () => {
    const intent: PairIntent = {
      action: "flatten",
      from: "both",
      to: "USDC",
      clipUsd: 200,
      reason: "stop",
      at: 1,
    };
    const legs = planIntentSwaps({
      intent,
      ...px,
      holdings: { spyxQty: 0.2, qqqxQty: 0, gldxQty: 0, usdcQty: 40 },
    });
    assert.equal(legs.length, 2);
    assert.equal(legs[0].inputMint, xstockMint("spyx"));
    assert.equal(legs[0].outputMint, SOL_MINT);
    assert.equal(legs[1].inputMint, USDC_MINT);
  });

  it("deploys a named sleeve from SOL", () => {
    const intent: PairIntent = {
      action: "deploy",
      from: "SOL",
      to: "GLDx",
      clipUsd: 20,
      reason: "deploy",
      at: 1,
    };
    const legs = planIntentSwaps({ intent, ...px });
    assert.equal(legs.length, 1);
    assert.equal(legs[0].outputMint, xstockMint("gldx"));
    assert.ok(legs[0].amount > 0.002);
  });
});

describe("live fill helper", () => {
  it("stamps the on-chain signature onto the paper decision", () => {
    const d = decisionFromIntent(
      {
        action: "swap",
        from: "SOL",
        to: "SPYx",
        clipUsd: 25,
        reason: "clip",
        at: 1,
        pairId: "sol-spyx",
      },
      "ABCDEFGH1234567890",
    );
    assert.equal(d.action, "swap");
    assert.match(d.reason, /ABCDEFGH/);
    assert.equal(d.pairId, "sol-spyx");
  });

  it("keeps the 24/7 flag on locked auto", () => {
    const a = lockedAuto({ mode: "live", liveDelegate: true, tradingPubkey: "x" });
    assert.equal(a.mode, "live");
    assert.equal(a.liveDelegate, true);
    assert.equal(lockedAuto({ mode: "paper" }).liveDelegate, false);
  });
});
