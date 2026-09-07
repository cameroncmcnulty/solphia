import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_TREASURY, TREASURY } from "../lib/config";
import { durableKind } from "../lib/persist";
import { treasuryAddress } from "../lib/treasury";

describe("treasury default", () => {
  it("pins the founder treasury when env/state are empty", () => {
    assert.equal(DEFAULT_TREASURY, "2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma");
    assert.ok(TREASURY.length >= 32);
    const addr = treasuryAddress();
    assert.ok(addr.length >= 32);
  });

  it("reports filesystem store when no Upstash/Blob env is set in tests", () => {
    assert.equal(durableKind(), "fs");
  });
});
