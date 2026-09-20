import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadDbcSdk } from "../lib/launch/dbcSdk";

describe("meteora dbc client", () => {
  it("keeps the vendored CJS on disk for Vercel tracing", () => {
    assert.ok(existsSync(path.join(process.cwd(), "src/vendor/meteora-dbc.cjs")));
  });

  it("loads DynamicBondingCurveClient from npm or the vendor file", () => {
    const m = loadDbcSdk();
    assert.equal(typeof m.DynamicBondingCurveClient, "function");
    assert.equal(typeof m.DynamicBondingCurveClient.create, "function");
  });
});
