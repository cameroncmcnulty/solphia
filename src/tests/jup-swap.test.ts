import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeUrls, JUP_FEE_BPS, jupFeeStatus, orderUrls } from "../lib/jup/swapV2";
import { JUP_PLUGIN_ACCOUNT, JUP_PLUGIN_FEE_BPS, JUP_PLUGIN_SRC } from "../lib/jup/plugin";
import { jupWalletState } from "../lib/jup/passthrough";

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
