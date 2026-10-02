import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_FUND, DEFAULT_OWNER, DEFAULT_TREASURY, LIVE_TRADING, TREASURY } from "../lib/config";
import { durableKind } from "../lib/persist";
import { treasuryAddress } from "../lib/treasury";
import { applyOpsConfig, emptyState } from "../lib/store";

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

describe("ops overlay", () => {
  it("applies newer $SPHA socials from durable ops onto a stale instance", () => {
    const local = emptyState();
    local.opsUpdatedAt = 1;
    local.sphaSocials = { x: "", telegram: "", discord: "", website: "" };
    const dirty = applyOpsConfig(local, {
      opsUpdatedAt: 2,
      sphaSocials: { x: "https://x.com/solphia", telegram: "https://t.me/solphia", discord: "https://discord.gg/solphia" },
      sphaMint: "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o",
    });
    assert.equal(dirty, true);
    assert.equal(local.sphaSocials?.x, "https://x.com/solphia");
    assert.equal(local.sphaSocials?.telegram, "https://t.me/solphia");
    assert.equal(local.sphaMint, "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o");
  });

  it("does not clobber a newer local save with stale remote ops", () => {
    const local = emptyState();
    local.opsUpdatedAt = 9;
    local.sphaSocials = { x: "https://x.com/fresh", telegram: "", discord: "", website: "" };
    const dirty = applyOpsConfig(local, {
      opsUpdatedAt: 2,
      sphaSocials: { x: "https://x.com/stale", telegram: "", discord: "" },
    });
    assert.equal(dirty, false);
    assert.equal(local.sphaSocials?.x, "https://x.com/fresh");
  });
});
