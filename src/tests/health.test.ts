import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SERVICES, nextTier, tierOf } from "../lib/health/catalog";
import { mergeTiers } from "../lib/health/probe";
import { pinataConfigured } from "../lib/pinata";

describe("health catalog", () => {
  it("covers every growth bottleneck with a next step", () => {
    const ids = SERVICES.map((s) => s.id);
    assert.deepEqual(ids.sort(), ["helius", "pinata", "signer", "upstash", "vercel", "xai"].sort());
    for (const s of SERVICES) {
      const cur = tierOf(s);
      assert.ok(cur.limits);
      assert.ok(cur.label);
    }
    const pin = SERVICES.find((s) => s.id === "pinata")!;
    assert.equal(tierOf(pin, "free").limits.storageGb, 1);
    assert.equal(tierOf(pin, "picnic").limits.storageGb, 1024);
    const nxt = nextTier(pin, "free");
    assert.equal(nxt?.id, "picnic");
  });

  it("lets a saved Picnic plan raise the Pinata ceiling", () => {
    const t = mergeTiers({ pinata: "picnic" });
    assert.equal(t.pinata, "picnic");
    const pin = SERVICES.find((s) => s.id === "pinata")!;
    assert.ok(tierOf(pin, t.pinata).limits.storageGb > 1);
  });

  it("does not invent a Pinata key from thin air", () => {
    assert.equal(pinataConfigured(), Boolean((process.env.PINATA_JWT || process.env.PINATA_API_KEY || "").trim()));
  });
});
