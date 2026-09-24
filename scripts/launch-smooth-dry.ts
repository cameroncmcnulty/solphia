/**
 * Dry-run the Pump-style launch path: pin art, pin metadata, build one tx.
 * Does not send. Fails the process if pin or tx build breaks.
 */
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
  /* no env */
}

import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { pinBytes, pinJson, pinataConfigured } from "../src/lib/pinata";
import { ipfsMetadataUrl } from "../src/lib/pinata";
import { tokenMetadataJson } from "../src/lib/token/metadata";
import { buildDbcLaunchTx } from "../src/lib/launch/dbc";
import { b64ToBytes } from "../src/lib/solana/wire";
import { connection } from "../src/lib/solana/connection";

const PAYER = "AidbgKaN6BhMmqQSERaW2rc3i8Dax4i295q3UTpTdhg4";

function fail(msg: string): never {
  console.error("FAIL", msg);
  process.exit(1);
}

/** 1x1 JPEG */
const TINY_JPG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//Z",
  "base64",
);

async function main() {
  if (!pinataConfigured()) fail("PINATA is not configured");
  const img = await pinBytes(TINY_JPG, "image/jpeg", "dry");
  if (!img?.cid) fail("pinBytes returned null");
  console.log("pinned image", img.cid.slice(0, 12));
  const image = ipfsMetadataUrl(img.cid, "jpg");
  const meta = await pinJson(
    tokenMetadataJson({ name: "DryRun", symbol: "DRY", description: "dry", image }),
    "dry-meta",
  );
  if (!meta?.cid) fail("pinJson returned null");
  console.log("pinned meta", meta.cid.slice(0, 12));
  const uri = ipfsMetadataUrl(meta.cid, "json");

  const mint = Keypair.generate();
  const built = await buildDbcLaunchTx({
    payer: PAYER,
    mint: mint.publicKey.toBase58(),
    name: "DryRun",
    symbol: "DRY",
    uri,
    buySol: 0,
    config: "",
  });
  if (!built.transaction || built.transaction.length < 32) fail("no launch tx");
  const bytes = b64ToBytes(built.transaction);
  const tx = Transaction.from(bytes);
  tx.partialSign(mint);
  if (built.configSecret) {
    const cfg = Keypair.fromSecretKey(b64ToBytes(built.configSecret));
    tx.partialSign(cfg);
    console.log("config extra signer", cfg.publicKey.toBase58());
  }
  console.log("tx bytes", bytes.length, "sigs", tx.signatures.length, "need", tx.signatures.filter((s) => !s.signature).length);
  const sim = await connection().simulateTransaction(tx);
  const logs = (sim.value.logs || []).join("\n");
  console.log("simulate err", sim.value.err);
  console.log("simulate tail", (sim.value.logs || []).slice(-10));
  if (/pool config not found/i.test(logs)) fail("simulate still missing pool config");
  if (sim.value.err && !/insufficient|0x1/.test(JSON.stringify(sim.value.err) + logs)) {
    fail("unexpected simulate error: " + JSON.stringify(sim.value.err));
  }
  console.log("OK launch path builds and does not look up a missing config");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
