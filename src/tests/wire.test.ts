import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { asTxB64, b64ToBytes, bytesToB64 } from "../lib/solana/wire";

describe("tx wire encoding", () => {
  it("round-trips bytes", () => {
    const src = Uint8Array.from([1, 2, 3, 250, 255, 0, 9]);
    const b64 = bytesToB64(src);
    assert.equal(b64ToBytes(b64).toString(), src.toString());
  });

  it("rejects objects that used to become atob('[object Object]')", () => {
    assert.throws(() => asTxB64({ foo: 1 }), /did not return a launch transaction/);
    assert.throws(() => b64ToBytes("[object Object]"), /corrupted/);
    assert.throws(() => b64ToBytes("undefined"), /corrupted|missing/);
  });

  it("accepts url-safe and padded base64", () => {
    const src = Uint8Array.from([255, 254, 253, 0, 1, 2, 3, 4]);
    const std = bytesToB64(src);
    const url = std.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    assert.equal(b64ToBytes(url).toString(), src.toString());
  });
});
