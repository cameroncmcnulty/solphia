import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  afterFeeUsdOn1k,
  detectClusters,
  fromCopyWallet,
  gradeWallets,
  stillGoodThisWeek,
  tagStyle,
  weekDecay,
} from "../lib/copy/quality";
import { seedRoster } from "../lib/copy/desk";
import { parseKolHtml } from "../lib/copy/scrape";

describe("wallet quality", () => {
  it("flags a 30d-hot wallet that went quiet this week", () => {
    const clukz = fromCopyWallet(seedRoster().find((w) => w.handle === "Clukz")!);
    assert.equal(stillGoodThisWeek(clukz), false);
    assert.ok(weekDecay(clukz.pnl7d, clukz.pnl30d) < 0.35);
  });

  it("does not copy a sub-50% win rate even if 7d is green", () => {
    const cupsey = fromCopyWallet(seedRoster().find((w) => w.handle === "Cupsey")!);
    const pain = fromCopyWallet(seedRoster().find((w) => w.handle === "Pain")!);
    const graded = gradeWallets([cupsey, pain, fromCopyWallet(seedRoster().find((w) => w.handle === "Decu")!)]);
    assert.equal(graded.find((w) => w.handle === "Cupsey")?.copied, false);
    assert.equal(graded.find((w) => w.handle === "Pain")?.copied, false);
    assert.equal(graded.find((w) => w.handle === "Decu")?.copied, true);
  });

  it("keeps only the better book in a farm cluster", () => {
    const a = fromCopyWallet(seedRoster()[0], {
      holdings: ["m1", "m2", "m3", "m4", "m5"].map((mint) => ({ mint })),
    });
    const b = fromCopyWallet(seedRoster()[1], {
      holdings: ["m1", "m2", "m3", "m4", "m6"].map((mint) => ({ mint })),
    });
    const clusters = detectClusters([a, b]);
    assert.ok((clusters.get(a.handle) || []).includes(b.handle));
    const graded = gradeWallets([a, b]);
    const copying = graded.filter((w) => w.copied);
    assert.equal(copying.length, 1);
    assert.ok(graded.some((w) => w.status === "clustered"));
  });

  it("tags high-velocity books as snipers", () => {
    assert.equal(tagStyle(fromCopyWallet(seedRoster()[0], { trades7d: 8000, holdings: [{ mint: "x", ageMin: 8 }] })), "sniper");
  });

  it("applies fee drag so after-fee $1k is not the KOL's raw PnL", () => {
    const n = afterFeeUsdOn1k(fromCopyWallet(seedRoster()[0], { trades7d: 400, avgTradeUsd: 400 }));
    assert.ok(n < 190700);
  });

  it("parses 7d PnL without swallowing the 30d figure", () => {
    const html = `7D PnL</div>+$192K 30D PnL</div>+$877.2K WR 7D / 1D 57.3% · 89.2% Trades (7d) 13,751 Avg trade size $376 Worst trade –$3,416 Current Holdings Holding 83% $59.1K MC +$14,251 PnL /token/DYFXwjj87D19ppXsWB6DDXk8Ah3d71tjc8S5epXCpump Latest trades /token/3WX6Md4yLR53DsmXK54mUSSTitujssuyeK9gzuMVpump`;
    const p = parseKolHtml(html);
    assert.equal(p.pnl7d, 192000);
    assert.equal(p.pnl30d, 877200);
    assert.equal(p.winRate, 57.3);
    assert.ok(p.holdings.some((h) => h.mint.startsWith("DYFX")));
  });
});
