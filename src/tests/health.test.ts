import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SERVICES, nextTier, tierOf } from "../lib/health/catalog";
import { lastKnownPinata, mergeTiers, recordHealthSample, windowSamples, type HealthSample } from "../lib/health/probe";
import { pinataConfigured } from "../lib/pinata";
import type { AppState } from "../lib/types";

describe("health catalog", () => {
  it("covers every growth bottleneck with a next step", () => {
    const ids = SERVICES.map((s) => s.id);
    assert.deepEqual(ids.sort(), ["helius", "pinata", "signer", "smtp", "upstash", "vercel", "xai"].sort());
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
    const jwt = (process.env.PINATA_JWT || "").trim();
    const key = (process.env.PINATA_API_KEY || "").trim();
    const secret = (process.env.PINATA_API_SECRET || "").trim();
    assert.equal(pinataConfigured(), Boolean(jwt || (key && secret)));
  });

  it("carries the last Pinata usage across empty tick samples", () => {
    const log: HealthSample[] = [
      {
        t: 1,
        tickAgeMs: 0,
        storeBytes: 10,
        rpcMs: null,
        jupMs: null,
        pinataBytes: 4096,
        pinataFiles: 3,
        source: "probe",
      },
      { t: 2, tickAgeMs: 0, storeBytes: 11, rpcMs: null, jupMs: null, pinataBytes: null, pinataFiles: null, source: "tick" },
    ];
    const pin = lastKnownPinata(log);
    assert.equal(pin.bytes, 4096);
    assert.equal(pin.files, 3);
  });

  it("windows samples to the last day", () => {
    const now = Date.now();
    const log: HealthSample[] = [
      { t: now - 48 * 3600_000, tickAgeMs: 0, storeBytes: 1, rpcMs: 10, jupMs: 10, pinataBytes: 1, pinataFiles: 1 },
      { t: now - 2 * 3600_000, tickAgeMs: 0, storeBytes: 2, rpcMs: 12, jupMs: 12, pinataBytes: 2, pinataFiles: 1 },
    ];
    assert.equal(windowSamples(log, 24 * 3600_000).length, 1);
  });

  it("coalesces health samples inside ten minutes", () => {
    const s = { healthLog: [] as HealthSample[] } as unknown as AppState;
    const base: HealthSample = {
      t: 1_000_000,
      tickAgeMs: 0,
      storeBytes: 8,
      rpcMs: 20,
      jupMs: 30,
      pinataBytes: 1,
      pinataFiles: 1,
      source: "probe",
    };
    recordHealthSample(s, base);
    recordHealthSample(s, { ...base, t: 1_000_000 + 60_000, storeBytes: 9, rpcMs: null });
    assert.equal(s.healthLog?.length, 1);
    assert.equal(s.healthLog?.[0].storeBytes, 9);
    assert.equal(s.healthLog?.[0].rpcMs, 20);
    recordHealthSample(s, { ...base, t: 1_000_000 + 11 * 60_000, storeBytes: 10 });
    assert.equal(s.healthLog?.length, 2);
  });
});
