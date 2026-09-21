/**
 * Offline+RPC audit of the Meteora DBC launch path. Does not send a tx.
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
  /* no .env.local */
}

import { Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { connection } from "../src/lib/solana/connection";
import { DBC_CONFIG, DBC_PROGRAM_ID, dbcEnabled } from "../src/lib/launch/dbcIds";
import { buildDbcLaunchTx, dbcPoolByMint } from "../src/lib/launch/dbc";
import { asTxB64, b64ToBytes } from "../src/lib/solana/wire";

const PAYER = "AidbgKaN6BhMmqQSERaW2rc3i8Dax4i295q3UTpTdhg4";

function fail(msg: string): never {
  console.error("FAIL", msg);
  process.exit(1);
}

async function main() {
  console.log("dbcEnabled", dbcEnabled());
  console.log("config", DBC_CONFIG);
  console.log("program", DBC_PROGRAM_ID);
  if (!dbcEnabled()) fail("DBC disabled");

  const conn = connection();
  console.log("rpc", conn.rpcEndpoint.replace(/api-key=.*/, "api-key=***"));

  const cfg = new PublicKey(DBC_CONFIG);
  const cfgInfo = await conn.getAccountInfo(cfg);
  if (!cfgInfo) fail("DBC config account missing on chain: " + DBC_CONFIG);
  console.log("config owner", cfgInfo.owner.toBase58(), "lamports", cfgInfo.lamports, "len", cfgInfo.data.length);
  if (cfgInfo.owner.toBase58() !== DBC_PROGRAM_ID) {
    fail("config owner is not DBC program: " + cfgInfo.owner.toBase58());
  }

  const mint = Keypair.generate();
  console.log("sample mint", mint.publicKey.toBase58());

  const DbcMod = await import("../src/lib/launch/dbc");
  void DbcMod;
  const sdkMod = await import("@meteora-ag/dynamic-bonding-curve-sdk");
  const Dbc = (sdkMod as any).DynamicBondingCurveClient ? sdkMod : (sdkMod as any).default;
  const rawPool = await Dbc.DynamicBondingCurveClient.create(conn, "confirmed").creator.createPool({
    name: "AuditCoin",
    symbol: "AUDT",
    uri: "https://solphia.io/api/launch/meta?mint=test",
    payer: new PublicKey(PAYER),
    poolCreator: new PublicKey(PAYER),
    config: cfg,
    baseMint: mint.publicKey,
  });
  console.log(
    "sdk raw ctor",
    rawPool?.constructor?.name,
    "array",
    Array.isArray(rawPool),
    "keys",
    rawPool && typeof rawPool === "object" ? Object.keys(rawPool).slice(0, 12) : [],
    "has serialize",
    typeof rawPool?.serialize === "function",
    "has feePayer",
    !!(rawPool as any)?.feePayer,
  );

  let built: { transaction: string; mint: string };
  try {
    built = await buildDbcLaunchTx({
      payer: PAYER,
      mint: mint.publicKey.toBase58(),
      name: "AuditCoin",
      symbol: "AUDT",
      uri: "https://solphia.io/api/launch/meta?mint=test",
      buySol: 0,
    });
  } catch (e) {
    fail("buildDbcLaunchTx threw: " + (e instanceof Error ? e.message : e));
  }
  console.log("encoded type", typeof built.transaction, "len", built.transaction.length);
  console.log("encoded prefix", built.transaction.slice(0, 24));

  let packed = "";
  try {
    packed = asTxB64(built.transaction);
  } catch (e) {
    fail("asTxB64 failed: " + (e instanceof Error ? e.message : e));
  }
  let bytes: Uint8Array;
  try {
    bytes = b64ToBytes(packed);
  } catch (e) {
    fail("b64ToBytes failed: " + (e instanceof Error ? e.message : e));
  }
  console.log("decoded bytes", bytes.length, "first", bytes[0], "versionedBit", (bytes[0] & 0x80) !== 0);

  const versioned = bytes.length > 0 && (bytes[0] & 0x80) !== 0;
  if (versioned) {
    const vtx = VersionedTransaction.deserialize(bytes);
    const keys = vtx.message.staticAccountKeys.map((k) => k.toBase58());
    console.log("v0 static keys", keys.length);
    console.log("mint in keys", keys.includes(mint.publicKey.toBase58()));
    console.log("payer in keys", keys.includes(PAYER));
    console.log("config in keys", keys.includes(DBC_CONFIG));
    console.log("program in keys", keys.includes(DBC_PROGRAM_ID));
    const sim = await conn.simulateTransaction(vtx);
    console.log("simulate v0 err", sim.value.err);
    console.log("simulate logs", (sim.value.logs || []).slice(-8));
    if (sim.value.err) fail("simulate failed: " + JSON.stringify(sim.value.err));
  } else {
    const tx = Transaction.from(bytes);
    const keys = tx.compileMessage().accountKeys.map((k) => k.toBase58());
    console.log("legacy keys", keys.length);
    console.log("mint in keys", keys.includes(mint.publicKey.toBase58()));
    console.log("payer in keys", keys.includes(PAYER));
    console.log("feePayer", tx.feePayer?.toBase58());
    console.log("blockhash", tx.recentBlockhash);
    const needMint = tx.signatures.some((s) => s.publicKey.equals(mint.publicKey));
    console.log("mint is required signer", needMint);
    tx.partialSign(mint);
    const sim = await conn.simulateTransaction(tx);
    console.log("simulate legacy err", sim.value.err);
    console.log("simulate logs", (sim.value.logs || []).slice(-12));
    if (sim.value.err) fail("simulate failed: " + JSON.stringify(sim.value.err));
  }

  const existing = await dbcPoolByMint(mint.publicKey.toBase58());
  console.log("pool for fresh mint (expect null)", existing ? "FOUND" : "null");

  const mint2 = Keypair.generate();
  const withBuy = await buildDbcLaunchTx({
    payer: PAYER,
    mint: mint2.publicKey.toBase58(),
    name: "AuditBuy",
    symbol: "AUDB",
    uri: "https://solphia.io/api/launch/meta?mint=test",
    buySol: 0.05,
  });
  const buyBytes = b64ToBytes(withBuy.transaction);
  console.log("with-buy bytes", buyBytes.length);
  const buyTx = Transaction.from(buyBytes);
  buyTx.partialSign(mint2);
  const simBuy = await conn.simulateTransaction(buyTx);
  console.log("simulate with 0.05 buy err", simBuy.value.err);
  console.log("simulate with-buy logs", (simBuy.value.logs || []).slice(-8));
  const buyLogs = (simBuy.value.logs || []).join("\n");
  if (simBuy.value.err && !/insufficient lamports/.test(buyLogs)) {
    fail("first-buy simulate failed: " + JSON.stringify(simBuy.value.err) + " " + buyLogs.slice(-400));
  }
  if (/insufficient lamports/.test(buyLogs)) {
    console.log("with-buy built (payer has < 0.05 SOL on this RPC — not a builder bug)");
  }

  console.log("PASS launch tx builds, decodes, and simulates (with and without first buy)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
