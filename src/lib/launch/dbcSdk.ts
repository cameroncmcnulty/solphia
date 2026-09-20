/**
 * Load Meteora DBC without webpack rewriting require().
 * createRequire() was minified to "a is not a function" on Vercel.
 * A Function-built import() is a real Node ESM load of the CJS file.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function nodeImport(specifier: string): Promise<any> {
  return new Function("u", "return import(u)")(specifier) as Promise<any>;
}

function unwrap(mod: any): any {
  const m = mod?.default ?? mod;
  if (m?.DynamicBondingCurveClient) return m;
  if (m?.default?.DynamicBondingCurveClient) return m.default;
  return m;
}

export function dbcClientFiles(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "node_modules/@meteora-ag/dynamic-bonding-curve-sdk/dist/index.cjs"),
    path.join(cwd, "src/vendor/meteora-dbc.cjs"),
    path.join(cwd, "vendor/meteora-dbc.cjs"),
  ];
}

export async function loadDbcSdk(): Promise<any> {
  const errors: string[] = [];
  for (const file of dbcClientFiles()) {
    if (!existsSync(file)) {
      errors.push(`${file}: missing`);
      continue;
    }
    try {
      const loaded = unwrap(await nodeImport(pathToFileURL(file).href));
      if (typeof loaded?.DynamicBondingCurveClient?.create !== "function") {
        errors.push(`${file}: no DynamicBondingCurveClient.create`);
        continue;
      }
      return loaded;
    } catch (e) {
      errors.push(`${file}: ${e instanceof Error ? e.message : e}`);
    }
  }
  try {
    const loaded = unwrap(await nodeImport("@meteora-ag/dynamic-bonding-curve-sdk"));
    if (typeof loaded?.DynamicBondingCurveClient?.create === "function") return loaded;
    errors.push("package-name: no DynamicBondingCurveClient.create");
  } catch (e) {
    errors.push(`package-name: ${e instanceof Error ? e.message : e}`);
  }
  throw new Error(`Meteora DBC client missing on this server. ${errors.join(" | ")}`);
}

let cached: Promise<any> | null = null;
export function dbcSdk(): Promise<any> {
  if (!cached) cached = loadDbcSdk();
  return cached;
}
