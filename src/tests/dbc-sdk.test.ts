import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { dbcEnabled } from "../lib/launch/dbcIds";
import { loadDbcSdk } from "../lib/launch/dbcSdk";
import * as DbcMod from "@meteora-ag/dynamic-bonding-curve-sdk";

describe("meteora dbc client", () => {
  it("keeps the vendored CJS and the npm dist on disk", () => {
    assert.ok(existsSync(path.join(process.cwd(), "src/vendor/meteora-dbc.cjs")));
    assert.ok(existsSync(path.join(process.cwd(), "node_modules/@meteora-ag/dynamic-bonding-curve-sdk/dist/index.cjs")));
  });

  it("uses the Meteora SDK as a real package (Option B)", () => {
    const m = (DbcMod as any).DynamicBondingCurveClient ? DbcMod : (DbcMod as any).default;
    assert.equal(typeof m.DynamicBondingCurveClient.create, "function");
    assert.equal(dbcEnabled(), true);
  });

  it("loads DynamicBondingCurveClient via native import of the CJS file", async () => {
    const m = await loadDbcSdk();
    assert.equal(typeof m.DynamicBondingCurveClient, "function");
    assert.equal(typeof m.DynamicBondingCurveClient.create, "function");
  });

  it("loads the vendor file with a Function import the way Vercel Node will", async () => {
    const file = path.join(process.cwd(), "src/vendor/meteora-dbc.cjs");
    const mod = await new Function("u", "return import(u)")(pathToFileURL(file).href);
    const m = mod.default ?? mod;
    assert.equal(typeof m.DynamicBondingCurveClient.create, "function");
  });

  it("loads the npm dist CJS the same way", async () => {
    const file = path.join(process.cwd(), "node_modules/@meteora-ag/dynamic-bonding-curve-sdk/dist/index.cjs");
    const mod = await new Function("u", "return import(u)")(pathToFileURL(file).href);
    const m = mod.default ?? mod;
    assert.equal(typeof m.DynamicBondingCurveClient.create, "function");
  });

  it("resolves @solana/web3.js from the SDK CJS the way Vercel require() will", () => {
    const { createRequire } = require("node:module") as typeof import("node:module");
    const req = createRequire(
      path.join(process.cwd(), "node_modules/@meteora-ag/dynamic-bonding-curve-sdk/dist/index.cjs"),
    );
    const resolved = req.resolve("@solana/web3.js");
    assert.ok(resolved.includes("web3.js"));
  });

  it("can construct a DBC client (the call launch actually makes)", async () => {
    const { Connection } = await import("@solana/web3.js");
    const m = await loadDbcSdk();
    const client = m.DynamicBondingCurveClient.create(new Connection("https://api.mainnet-beta.solana.com", "confirmed"), "confirmed");
    assert.ok(client.state);
    assert.ok(client.creator);
    assert.ok(client.pool);
  });
});
