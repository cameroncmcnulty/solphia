/**
 * Live mainnet smoke: create a pad coin from the deployer, then buy more.
 * Uses 0.01 SOL launch buy + 0.01 SOL follow-up. Prints signatures only.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair, Transaction } from "@solana/web3.js";

function loadRpc() {
  const raw = readFileSync(resolve("programs/solphia-pad/keys/rpc.txt"), "utf8").trim();
  try {
    const key = new URL(raw).searchParams.get("api-key");
    if (key) process.env.HELIUS_API_KEY = key;
  } catch {
    /* public rpc */
  }
}

async function main() {
  loadRpc();
  const { buildPadLaunchTx, buildPadTradeTx, padCurveReady, waitForPadCurve } = await import("../src/lib/launch/program");
  const { sendRawAndConfirm } = await import("../src/lib/tx/send");

  const secret = JSON.parse(readFileSync(resolve("programs/solphia-pad/keys/deployer.json"), "utf8")) as number[];
  const kp = Keypair.fromSecretKey(Uint8Array.from(secret));
  const payer = kp.publicKey.toBase58();
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(8)));

  console.log("payer", payer);
  const built = await buildPadLaunchTx({
    payer,
    nonce,
    name: "Pad Smoke",
    symbol: "SMOK",
    uri: "https://solphia.io",
    buySol: 0.01,
  });
  console.log("mint", built.mint, "tokensOut", built.tokensOut);

  const launchTx = Transaction.from(Buffer.from(built.transaction, "base64"));
  launchTx.partialSign(kp);
  const launched = await sendRawAndConfirm(launchTx.serialize());
  if (!launched.ok) throw new Error(`launch send failed: ${launched.error}`);
  console.log("launch_sig", launched.signature);

  const ready = await waitForPadCurve(built.mint, launched.signature);
  if (!ready.ok) throw new Error(`curve missing after launch: ${ready.error}`);
  console.log("curve_real_sol", ready.curve.realSol, "phase", ready.curve.phase);

  const buy = await buildPadTradeTx({
    mint: built.mint,
    owner: payer,
    creator: payer,
    side: "buy",
    sol: 0.01,
  });
  if (!buy.ok) throw new Error(`follow-up buy build failed: ${buy.error}`);
  const buyTx = Transaction.from(Buffer.from(buy.transaction, "base64"));
  buyTx.partialSign(kp);
  const bought = await sendRawAndConfirm(buyTx.serialize());
  if (!bought.ok) throw new Error(`follow-up buy send failed: ${bought.error}`);
  console.log("buy_sig", bought.signature, "tokensOut", buy.tokensOut);

  const live = await padCurveReady(built.mint);
  if (!live.ok) throw new Error("curve gone after buy");
  console.log("after_buy_real_sol", live.curve.realSol, "tokensSold", live.curve.tokensSold);
  if (!(live.curve.realSol > ready.curve.realSol)) throw new Error("follow-up buy did not add SOL to the curve");
  console.log("SMOKE_OK");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
