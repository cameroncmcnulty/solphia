import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { grantFounder, isFounder } from "../lib/access";
import { emptyState } from "../lib/store";

describe("founder access", () => {
  it("comps a wallet to full terminal with no expiry soon", () => {
    const s = emptyState();
    const pk = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
    assert.equal(isFounder(s, pk), false);
    grantFounder(s, pk);
    assert.equal(isFounder(s, pk), true);
    const u = s.users.find((x) => x.pubkey === pk);
    assert.equal(u?.plan, "full");
    assert.equal(u?.comped, true);
    assert.ok((u?.subscribedUntil || 0) > Date.now() + 1000 * 60 * 60 * 24 * 30);
  });
});
