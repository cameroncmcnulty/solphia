import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_FUND, DEFAULT_OWNER, DEFAULT_TREASURY, LIVE_TRADING, TREASURY } from "../lib/config";
import { durableKind } from "../lib/persist";
import { treasuryAddress } from "../lib/treasury";
import { emptyState } from "../lib/store";

describe("treasury default", () => {
  it("pins the founder treasury when env/state are empty", () => {
    assert.equal(DEFAULT_TREASURY, "BobXWqFWhRwyBS3Wra3fornbmnwpmN1Ctp5brN1RZ9y3");
    assert.equal(DEFAULT_OWNER, "AidbgKaN6BhMmqQSERaW2rc3i8Dax4i295q3UTpTdhg4");
    assert.equal(DEFAULT_FUND, "BtVQGxHtCpaBZcKmFHegeD7yxXUTsNXVgMfdrHk6gQ8C");
    assert.ok(TREASURY.length >= 32);
    const addr = treasuryAddress();
    assert.ok(addr.length >= 32);
  });

  it("reports filesystem store when no Upstash/Blob env is set in tests", () => {
    assert.equal(durableKind(), "fs");
  });

  it("does not keep a stale liveTrading false on a fresh desk", () => {
    assert.equal(LIVE_TRADING, true);
    const s = emptyState();
    assert.equal(s.liveTrading, undefined);
    assert.equal(s.liveV, 2);
  });
});
