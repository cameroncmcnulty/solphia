import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function heliusKey(): string {
  if (process.env.HELIUS_API_KEY) return process.env.HELIUS_API_KEY;
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return "";
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.startsWith("HELIUS_API_KEY=")) continue;
    return line.slice("HELIUS_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

describe("Helius live", () => {
  it("getHealth on the keyed RPC", async (t) => {
    const key = heliusKey();
    if (!key) {
      t.skip("HELIUS_API_KEY not set");
      return;
    }
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json()) as { result?: string; error?: { message?: string } };
    assert.equal(res.ok, true, json.error?.message || `http ${res.status}`);
    assert.equal(json.result, "ok");
  });

  it("enhanced tx history for Pump.fun program", async (t) => {
    const key = heliusKey();
    if (!key) {
      t.skip("HELIUS_API_KEY not set");
      return;
    }
    const pump = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
    const res = await fetch(
      `https://api.helius.xyz/v0/addresses/${pump}/transactions?api-key=${key}&limit=5`,
      { signal: AbortSignal.timeout(12000) },
    );
    assert.equal(res.ok, true, `enhanced http ${res.status}`);
    const json = (await res.json()) as unknown;
    assert.ok(Array.isArray(json), "expected tx array");
    assert.ok((json as unknown[]).length >= 1, "Pump.fun should have recent txs");
  });
});
