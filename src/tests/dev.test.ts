import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allocate, parseRecipients, toRawAmount } from "../lib/dev/airdrop";
import { linearSchedule, splitAmount } from "../lib/dev/vesting";
import { coachLines, draftToSnapshot, EMPTY_DRAFT, scoreDraft } from "../lib/dev/preview";

describe("dev tools", () => {
  it("parses wallets and weights, skipping junk", () => {
    const rows = parseRecipients(
      "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o,2\nnot-an-address\n4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9 1\n",
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].weight, 2);
  });

  it("splits a weighted airdrop without losing dust on the last wallet", () => {
    const rec = parseRecipients(
      "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o,1\n4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9,3\n",
    );
    const out = allocate(rec, 100n);
    assert.equal(out.reduce((s, r) => s + r.amount, 0n), 100n);
    assert.equal(out.find((r) => r.address.startsWith("4vw5"))?.amount, 75n);
  });

  it("converts token amounts to raw units", () => {
    assert.equal(toRawAmount(1.5, 6), 1_500_000n);
  });

  it("builds a cliff plus linear vest that sums to 100%", () => {
    const t = linearSchedule({ startAt: Date.UTC(2026, 0, 1), months: 12, cliffMonths: 3 });
    const sum = t.reduce((s, x) => s + x.pct, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9);
    const parts = splitAmount(1_000_000n, t);
    assert.equal(parts.reduce((s, p) => s + p.amount, 0n), 1_000_000n);
  });

  it("scores a reckless launch as skip and a locked one higher", () => {
    const bad = scoreDraft({
      ...EMPTY_DRAFT,
      name: "Rug",
      symbol: "RUG",
      venue: "spl",
      revokeMint: false,
      revokeFreeze: false,
      lockLp: false,
      teamPct: 40,
      airdropPct: 50,
      airdropWallets: 3,
    });
    assert.equal(bad.verdict, "skip");
    const lines = coachLines(bad, {
      ...EMPTY_DRAFT,
      venue: "spl",
      revokeMint: false,
      revokeFreeze: false,
      lockLp: false,
      airdropPct: 50,
      airdropWallets: 3,
    });
    assert.ok(lines.some((l) => /mint authority/i.test(l)));

    const good = scoreDraft({
      ...EMPTY_DRAFT,
      name: "Clean",
      symbol: "CLN",
      venue: "pumpfun",
      revokeMint: true,
      revokeFreeze: true,
      lockLp: true,
      seedBuySol: 2,
      airdropPct: 5,
      airdropWallets: 40,
    });
    assert.ok(good.score > bad.score);
    assert.ok(draftToSnapshot({ ...EMPTY_DRAFT, lockLp: true, revokeMint: true, revokeFreeze: true }).lpLockedOrBurned);
  });
});
