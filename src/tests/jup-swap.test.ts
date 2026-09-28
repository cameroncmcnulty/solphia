import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeUrls, JUP_FEE_BPS, jupFeeStatus, orderUrls } from "../lib/jup/swapV2";
import { JUP_PLUGIN_ACCOUNT, JUP_PLUGIN_FEE_BPS, JUP_PLUGIN_SRC } from "../lib/jup/plugin";

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
});
