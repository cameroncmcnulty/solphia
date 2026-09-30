import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeUrls, JUP_FEE_BPS, jupFeeStatus, orderUrls } from "../lib/jup/swapV2";
import { parseQuote } from "../lib/pair/jupiter";
import { SOL_MINT, USDC_MINT } from "../lib/pair/mints";
import { JUP_PLUGIN_ACCOUNT, JUP_PLUGIN_FEE_BPS, JUP_PLUGIN_SRC } from "../lib/jup/plugin";
import { jupWalletState } from "../lib/jup/passthrough";
import {
  clearSwapNotice,
  formatSwapError,
  isPhantomSwapPending,
  loadSwapNotice,
  noticeFromSwapError,
  PHANTOM_SWAP_PENDING,
  saveSwapNotice,
} from "../lib/jup/swapNotice";

const OWNER = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";

describe("jupiter swap v2", () => {
  it("never points at the dead lite-api swap/v2 path", () => {
    const urls = [...orderUrls(), ...executeUrls()];
    assert.ok(urls.length >= 2);
    for (const u of urls) {
      assert.equal(u.includes("lite-api.jup.ag/swap/v2"), false);
      assert.ok(u.includes("/order") || u.includes("/execute"));
    }
    assert.ok(orderUrls().some((u) => u.includes("api.jup.ag/swap/v2/order")));
  });

  it("advertises the 1 percent referral account", () => {
    const s = jupFeeStatus();
    assert.equal(s.referralFeeBps, JUP_FEE_BPS);
    assert.equal(s.referralFeeBps, 100);
    assert.equal(s.referralAccount, "rT14BqLLxVXiyK3ZeoeK8kCuU9sCQHVYUCXuBjeG8cV");
  });

  it("points the embed at the official plugin with the same 1 percent referral", () => {
    assert.equal(JUP_PLUGIN_SRC, "https://plugin.jup.ag/plugin-v1.js");
    assert.equal(JUP_PLUGIN_FEE_BPS, 100);
    assert.equal(JUP_PLUGIN_ACCOUNT, "rT14BqLLxVXiyK3ZeoeK8kCuU9sCQHVYUCXuBjeG8cV");
  });

  it("marks a Solphia owner as connected without injected Phantom", () => {
    const s = jupWalletState(OWNER);
    assert.equal(s.connected, true);
    assert.equal(s.publicKey?.toBase58(), OWNER);
    assert.equal(s.publicKey?.toString(), OWNER);
    assert.equal(s.wallet?.adapter?.publicKey?.toBase58(), OWNER);
    assert.equal(s.wallet?.adapter?.connected, true);
    assert.equal(typeof s.signTransaction, "function");
    assert.equal(typeof s.wallet?.adapter?.signTransaction, "function");
    assert.equal(s.wallet?.adapter?.name, "Phantom");
  });

  it("stays disconnected without a pubkey", () => {
    const s = jupWalletState(null);
    assert.equal(s.connected, false);
    assert.equal(s.publicKey, null);
    assert.equal(s.wallet, null);
    assert.equal(s.signTransaction, undefined);
  });

  it("ignores a junk pubkey", () => {
    const s = jupWalletState("not-a-wallet");
    assert.equal(s.connected, false);
    assert.equal(s.publicKey, null);
  });
});

describe("jupiter swap notice", () => {
  it("pulls the real message out of Jupiter error shapes", () => {
    assert.equal(formatSwapError("slippage exceeded"), "slippage exceeded");
    assert.equal(formatSwapError(new Error("no route")), "no route");
    assert.equal(formatSwapError({ message: "Transaction simulation failed" }), "Transaction simulation failed");
    assert.equal(formatSwapError({ error: { message: "0x1771" } }), "0x1771");
    assert.equal(formatSwapError(null), "Swap failed.");
  });

  it("does not treat Phantom UL as a swap failure", () => {
    assert.equal(isPhantomSwapPending("Approve in Phantom. The swap lands when you come back."), true);
    assert.equal(isPhantomSwapPending(PHANTOM_SWAP_PENDING), true);
    const n = noticeFromSwapError(new Error("Approve in Phantom. The swap lands when you come back."));
    assert.equal(n.kind, "pending");
    assert.equal(n.text, PHANTOM_SWAP_PENDING);
    const real = noticeFromSwapError({ message: "Slippage tolerance exceeded" });
    assert.equal(real.kind, "error");
    assert.equal(real.text, "Slippage tolerance exceeded");
  });

  it("round-trips the last error through sessionStorage", () => {
    const mem = new Map<string, string>();
    const fake = {
      getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
      setItem: (k: string, v: string) => {
        mem.set(k, String(v));
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
    };
    Object.defineProperty(globalThis, "sessionStorage", { value: fake, configurable: true });
    saveSwapNotice({ kind: "error", text: "Custom program error: 0x1", at: 1 });
    const got = loadSwapNotice();
    assert.equal(got?.kind, "error");
    assert.equal(got?.text, "Custom program error: 0x1");
    clearSwapNotice();
    assert.equal(loadSwapNotice(), null);
  });
});

describe("jupiter quote payload", () => {
  it("keeps swapMode so /swap can deserialize the quote", () => {
    const q = parseQuote({
      inputMint: SOL_MINT,
      inAmount: "250000000",
      outputMint: USDC_MINT,
      outAmount: "1",
      otherAmountThreshold: "1",
      swapMode: "ExactIn",
      slippageBps: 100,
      priceImpactPct: "0.0001",
      routePlan: [{ swapInfo: { ammKey: "x", inputMint: SOL_MINT, outputMint: USDC_MINT, label: "Raydium" } }],
      contextSlot: 1,
    });
    assert.ok(q);
    assert.equal(q?.swapMode, "ExactIn");
    assert.equal(q?.contextSlot, 1);
    assert.equal((q?.routePlan?.[0] as { swapInfo?: { ammKey?: string } })?.swapInfo?.ammKey, "x");
  });
});
