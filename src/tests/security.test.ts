import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertNoSecretLeak, isEmail, isSolanaAddress, rateLimit, sanitizeText, signToken, verifyToken } from "../lib/security";
import { verifySiws } from "../lib/wallet/siws";

describe("security", () => {
  it("accepts Solana addresses and rejects junk", () => {
    assert.equal(isSolanaAddress("D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81"), true);
    assert.equal(isSolanaAddress("0xdead"), false);
    assert.equal(isSolanaAddress("drop table"), false);
  });

  it("sanitizes and bounds text", () => {
    const dirty = "<script>alert(1)</script>" + "x".repeat(500);
    const clean = sanitizeText(dirty, 20);
    assert.equal(clean.includes("<"), false);
    assert.ok(clean.length <= 20);
  });

  it("round-trips HMAC tokens and rejects tampers", () => {
    const tok = signToken("admin:1", "secret");
    assert.equal(verifyToken(tok, "secret"), "admin:1");
    assert.equal(verifyToken(tok + "x", "secret"), null);
    assert.equal(verifyToken(tok, "other"), null);
  });

  it("rate-limits a key", () => {
    const k = "test:" + Math.random();
    assert.equal(rateLimit(k, 2, 10_000), true);
    assert.equal(rateLimit(k, 2, 10_000), true);
    assert.equal(rateLimit(k, 2, 10_000), false);
  });

  it("refuses to serialize private-key shaped payloads", () => {
    assert.throws(() => assertNoSecretLeak({ privateKey: "abc" }));
    assert.doesNotThrow(() => assertNoSecretLeak({ pubkey: "abc" }));
  });

  it("validates email and rejects SIWS junk signatures", () => {
    assert.equal(isEmail("trader@solphia.io"), true);
    assert.equal(isEmail("nope"), false);
    assert.equal(
      verifySiws("D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81", "hello", "AAAA"),
      false,
    );
  });
});
