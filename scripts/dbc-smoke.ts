import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair, Transaction } from "@solana/web3.js";

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
  const { buildDbcLaunchTx, buildDbcTradeTx, waitForDbcPool } = await import("../src/lib/launch/dbc");
  const { sendRawAndConfirm } = await import("../src/lib/tx/send");
  const secret = JSON.parse(readFileSync(resolve("programs/solphia-pad/keys/deployer.json"), "utf8")) as number[];
  const payer = Keypair.fromSecretKey(Uint8Array.from(secret));
  const mint = Keypair.generate();
  console.log("mint", mint.publicKey.toBase58());
  const built = await buildDbcLaunchTx({
    payer: payer.publicKey.toBase58(),
    mint: mint.publicKey.toBase58(),
    name: "Dbc Smoke",
    symbol: "DBCS",
    uri: "https://solphia.io",
    buySol: 0.01,
  });
  const tx = Transaction.from(Buffer.from(built.transaction, "base64"));
  tx.partialSign(payer, mint);
  const sent = await sendRawAndConfirm(tx.serialize());
  if (!sent.ok) throw new Error(`launch failed: ${sent.error}`);
  console.log("launch_sig", sent.signature);
  const pool = await waitForDbcPool(mint.publicKey.toBase58());
  if (!pool) throw new Error("dbc pool missing");
  console.log("pool_ok");
  const buy = await buildDbcTradeTx({
    mint: mint.publicKey.toBase58(),
    owner: payer.publicKey.toBase58(),
    side: "buy",
    sol: 0.01,
  });
  if (!buy.ok) throw new Error(`buy build failed: ${buy.error}`);
  const buyTx = Transaction.from(Buffer.from(buy.transaction, "base64"));
  buyTx.partialSign(payer);
  const bought = await sendRawAndConfirm(buyTx.serialize());
  if (!bought.ok) throw new Error(`buy failed: ${bought.error}`);
  console.log("buy_sig", bought.signature);
  const SOL = "So11111111111111111111111111111111111111112";
  const jup = await fetch(
    `https://lite-api.jup.ag/swap/v1/quote?inputMint=${SOL}&outputMint=${mint.publicKey.toBase58()}&amount=10000000&slippageBps=100`,
  );
  const jq = await jup.json();
  console.log("jupiter", jq.outAmount ? "ROUTE" : jq.error || jq.message || JSON.stringify(jq).slice(0, 180));
  console.log("DBC_SMOKE_OK");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
