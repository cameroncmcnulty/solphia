import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyState, hotOwners, MAX_TICK_TRADERS, setLiveOwner, touchHot } from "../lib/store";
import { emptyTrader } from "../lib/auto";
import { assertSpotOnly, LEVERAGE_LIVE, SPOT_LEVERAGE, leverageVenue } from "../lib/leverage";
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
  it("is spot-only until a perps venue is wired", () => {
    assert.equal(LEVERAGE_LIVE, false);
    assert.equal(SPOT_LEVERAGE, 1);
    assert.equal(leverageVenue(), "spot");
    assert.doesNotThrow(() => assertSpotOnly(1));
    assert.throws(() => assertSpotOnly(2));
  });
});
