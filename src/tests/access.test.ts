import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { grantFounder, isFounder, levSeatOk, liveSeatOk, revokeFounder } from "../lib/access";
import { emptyState } from "../lib/store";

describe("founder access", () => {
  it("comps a wallet to full terminal with no expiry soon", () => {
    const s = emptyState();
    const pk = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
    assert.equal(isFounder(s, pk), false);
    grantFounder(s, pk);
    assert.equal(isFounder(s, pk), true);
    const u = s.users.find((x) => x.pubkey === pk);
    assert.equal(u?.plan, "lev");
    assert.equal(u?.comped, true);
    assert.ok((u?.subscribedUntil || 0) > Date.now() + 1000 * 60 * 60 * 24 * 30);
    assert.equal(liveSeatOk(s, pk), true);
    revokeFounder(s, pk);
    assert.equal(isFounder(s, pk), false);
    assert.equal(liveSeatOk(s, pk), false);
    assert.equal(levSeatOk(s, pk), false);
  });

  it("lev plan unlocks 2x and live does not", () => {
    const s = emptyState();
    const pk = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
    s.users.push({
      pubkey: pk,
      plan: "live",
      createdAt: Date.now(),
      lastSeen: Date.now(),
      alertsEnabled: true,
      subscribedUntil: Date.now() + 86_400_000,
    });
    assert.equal(liveSeatOk(s, pk), true);
    assert.equal(levSeatOk(s, pk), false);
    s.users[0].plan = "lev";
    assert.equal(levSeatOk(s, pk), true);
  });
});
