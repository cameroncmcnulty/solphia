/**
 * Load the Meteora DBC client on Vercel.
 *
 * webpackIgnore + a relative ../vendor path compiles to
 * /var/task/.next/server/vendor/meteora-dbc.cjs — that file is never there.
 * Resolve from cwd / node_modules instead, which file tracing can include.
 */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

function rootRequire() {
  return createRequire(path.join(process.cwd(), "package.json"));
}

function vendorCandidates(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "src/vendor/meteora-dbc.cjs"),
    path.join(cwd, "vendor/meteora-dbc.cjs"),
    path.join(cwd, ".next/server/vendor/meteora-dbc.cjs"),
  ];
}

export function loadDbcSdk(): any {
  const req = rootRequire();
  const errors: string[] = [];
  try {
    const npm = req("@meteora-ag/dynamic-bonding-curve-sdk");
    return npm?.default ?? npm;
  } catch (e) {
    errors.push(`npm: ${e instanceof Error ? e.message : e}`);
  }
  for (const file of vendorCandidates()) {
    if (!existsSync(file)) {
      errors.push(`${file}: missing`);
      continue;
    }
    try {
      const mod = req(file);
      return mod?.default ?? mod;
    } catch (e) {
      errors.push(`${file}: ${e instanceof Error ? e.message : e}`);
    }
  }
  throw new Error(`Meteora DBC client missing on this server. ${errors.join(" | ")}`);
}

let cached: any;
export function dbcSdk(): any {
  if (!cached) cached = loadDbcSdk();
  return cached;
}
