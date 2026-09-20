/**
 * One-time: create the Solphia Meteora DBC partner config.
 * Fees claim to treasury. Jupiter instant-routes this program.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair, Transaction } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { DEFAULT_TREASURY } from "../src/lib/protocolWallets";
import { solphiaCurveConfig } from "../src/lib/launch/dbc";

function loadRpc() {
  const raw = readFileSync(resolve("programs/solphia-pad/keys/rpc.txt"), "utf8").trim();
  try {
    const key = new URL(raw).searchParams.get("api-key");
    if (key) process.env.HELIUS_API_KEY = key;
  } catch {
    /* public */
  }
}

async function main() {
  loadRpc();
  const { connection } = await import("../src/lib/solana/connection");
  const { sendRawAndConfirm } = await import("../src/lib/tx/send");
  const secret = JSON.parse(readFileSync(resolve("programs/solphia-pad/keys/deployer.json"), "utf8")) as number[];
  const payer = Keypair.fromSecretKey(Uint8Array.from(secret));
  const config = Keypair.generate();
  const path = resolve("programs/solphia-pad/keys/dbc-config.json");
  writeFileSync(path, JSON.stringify([...config.secretKey]));
  const conn = connection();
  // @ts-expect-error vendored CJS
  const dbcMod = await import("../src/vendor/meteora-dbc.cjs");
  const DynamicBondingCurveClient = dbcMod.DynamicBondingCurveClient || dbcMod.default?.DynamicBondingCurveClient;
  const client = DynamicBondingCurveClient.create(conn, "confirmed");
  const treasury = new (await import("@solana/web3.js")).PublicKey(DEFAULT_TREASURY);
  const tx = await client.partner.createConfig({
    ...(await solphiaCurveConfig()),
    config: config.publicKey,
    feeClaimer: treasury,
    leftoverReceiver: treasury,
    payer: payer.publicKey,
    quoteMint: NATIVE_MINT,
  });
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = blockhash;
  tx.partialSign(payer, config);
  const sent = await sendRawAndConfirm(tx.serialize());
  if (!sent.ok) throw new Error(sent.error);
  console.log("dbc_config", config.publicKey.toBase58());
  console.log("sig", sent.signature);
  console.log("set NEXT_PUBLIC_SOLPHIA_DBC_CONFIG to that pubkey");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
