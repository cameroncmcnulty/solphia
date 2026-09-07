import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyState, hotOwners, MAX_TICK_TRADERS, setLiveOwner, touchHot } from "../lib/store";
import { emptyTrader } from "../lib/auto";
import { SPOT_LEVERAGE, borrowUsd, canUseLeverage, leverageVenue, liqPrice, openFeeUsd } from "../lib/leverage";
import { KEYS } from "../lib/persist";

describe("scale store", () => {
  it("ticks live and recent owners only, and caps the batch", () => {
    const s = emptyState();
    const now = Date.now();
    for (let i = 0; i < 80; i++) {
      const owner = `owner${i}1111111111111111111111111111111`.slice(0, 44);
      s.traders[owner] = emptyTrader(owner);
      touchHot(s, owner, now - i * 1000);
    }
    const live = "LiveOwner11111111111111111111111111111111".slice(0, 44);
    s.traders[live] = emptyTrader(live);
    s.traders[live].auto.mode = "live";
    s.traders[live].auto.armed = true;
    setLiveOwner(s, live, true);
    const hot = hotOwners(s, now);
    assert.ok(hot.includes(live));
    assert.ok(hot.length <= MAX_TICK_TRADERS);
    assert.equal(KEYS.trader("abc").startsWith("solphia:trader:"), true);
  });
});

describe("leverage", () => {
  it("prices SOL-PERP with Jupiter fees and a real liq", () => {
    assert.equal(SPOT_LEVERAGE, 1);
    assert.equal(leverageVenue(1), "spot");
    assert.equal(leverageVenue(2), "jupiter_perps");
    assert.equal(Math.round(liqPrice(100, 2) * 10) / 10, 60);
    assert.equal(Math.round(liqPrice(100, 3) * 100) / 100, 73.33);
    assert.equal(openFeeUsd(1000), 0.6);
    assert.equal(canUseLeverage("live"), false);
    assert.equal(canUseLeverage("lev"), true);
    assert.equal(canUseLeverage("paper", true), true);
    const hour = borrowUsd({ notionalUsd: 1000, lev: 2, from: 0, to: 3_600_000 });
    assert.ok(hour > 0 && hour < 0.1);
  });
});
