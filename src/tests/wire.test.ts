import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Keypair, SystemProgram, Transaction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { asTxB64, b64ToBytes, bytesToB64 } from "../lib/solana/wire";
import { parseTx, serializeTx } from "../lib/solana/extraSign";

describe("tx wire encoding", () => {
  it("round-trips bytes", () => {
    const src = Uint8Array.from([1, 2, 3, 250, 255, 0, 9]);
    const b64 = bytesToB64(src);
    assert.equal(b64ToBytes(b64).toString(), src.toString());
  });

  it("rejects objects that used to become atob('[object Object]')", () => {
    assert.throws(() => asTxB64({ foo: 1 }), /did not return a launch transaction/);
    assert.throws(() => b64ToBytes("[object Object]"), /corrupted/);
    assert.throws(() => b64ToBytes(""), /missing/);
    assert.throws(() => b64ToBytes("%%%"), /corrupted/);
  });

  it("accepts url-safe and padded base64", () => {
    const src = Uint8Array.from([255, 254, 253, 0, 1, 2, 3, 4]);
    const std = bytesToB64(src);
    const url = std.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    assert.equal(b64ToBytes(url).toString(), src.toString());
  });
});

describe("parseTx", () => {
  it("reads a Jupiter-style versioned tx whose first byte is signature count, not 0x80", () => {
    const payer = Keypair.generate();
    const msg = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: "11111111111111111111111111111111",
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: payer.publicKey,
          lamports: 1,
        }),
      ],
    }).compileToV0Message();
    const raw = new VersionedTransaction(msg).serialize();
    assert.equal(raw[0] & 0x80, 0);
    assert.throws(() => Transaction.from(raw), /Versioned messages must be deserialized/);
    const parsed = parseTx(raw);
    assert.equal("version" in parsed.message, true);
    assert.ok(serializeTx(parsed).length > 32);
  });

  it("still reads a legacy pad tx without throwing", () => {
    const payer = Keypair.generate();
    const tx = new Transaction();
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = "11111111111111111111111111111111";
    tx.add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: payer.publicKey,
        lamports: 1,
      }),
    );
    const parsed = parseTx(tx.serialize({ requireAllSignatures: false }));
    assert.ok(parsed);
    assert.ok("message" in parsed || "instructions" in parsed);
  });
});
