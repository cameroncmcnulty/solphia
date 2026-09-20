import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { dbcClientFiles, loadDbcSdk } from "../lib/launch/dbcSdk";

describe("meteora dbc client", () => {
  it("keeps the vendored CJS and the npm dist on disk", () => {
    assert.ok(existsSync(path.join(process.cwd(), "src/vendor/meteora-dbc.cjs")));
    assert.ok(existsSync(path.join(process.cwd(), "node_modules/@meteora-ag/dynamic-bonding-curve-sdk/dist/index.cjs")));
  });

  it("lists real files first so Vercel tracing has something to copy", () => {
    const files = dbcClientFiles();
    assert.ok(files.some((f) => /dist[\\/]index\.cjs$/.test(f)));
    assert.ok(files.some((f) => /meteora-dbc\.cjs$/.test(f)));
    assert.ok(files.every((f) => path.isAbsolute(f)));
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

  it("can construct a DBC client (the call launch actually makes)", async () => {
    const { Connection } = await import("@solana/web3.js");
    const m = await loadDbcSdk();
    const client = m.DynamicBondingCurveClient.create(new Connection("https://api.mainnet-beta.solana.com", "confirmed"), "confirmed");
    assert.ok(client.state);
    assert.ok(client.creator);
    assert.ok(client.pool);
  });
});
