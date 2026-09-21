import { readFileSync } from "node:fs";
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  /* ignore */
}

import { PublicKey } from "@solana/web3.js";
import { connection } from "../src/lib/solana/connection";
import { dbcPoolByMint } from "../src/lib/launch/dbc";

const mint = process.argv[2] || "CkjBiD6M61YHUbGtp9QA2UVrBKz3r56P2AB3sxJuh3F";

async function main() {
  const conn = connection();
  const pk = new PublicKey(mint);
  const info = await conn.getAccountInfo(pk);
  console.log("mint", mint);
  console.log("account", info ? { owner: info.owner.toBase58(), len: info.data.length, lamports: info.lamports } : null);
  const pool = await dbcPoolByMint(mint);
  if (!pool) {
    console.log("dbc pool: none");
  } else {
    const a = pool.account as any;
    const inner = a.poolState || a;
    console.log("dbc pool", {
      pubkey: pool.publicKey.toBase58(),
      creator: String(inner.creator || ""),
      config: String(inner.config || ""),
    });
  }
  const sigs = await conn.getSignaturesForAddress(pk, { limit: 8 });
  console.log(
    "sigs",
    sigs.map((s) => ({ sig: s.signature, err: s.err, t: s.blockTime })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
