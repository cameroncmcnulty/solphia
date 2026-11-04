import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LIVE_SKIM_BPS, PAD_CURVE_BPS, buildProfitDesk } from "../lib/profit/catalog";
import { SWAP_FEE_BPS, splitFee, feeOn } from "../lib/launch/curve";
import { liveClipFeeSol, liveSwapFeeSol } from "../lib/swap/route";
import { PAD_SWAP_FEE_BPS, splitPadSpend } from "../lib/swap/pad";
import { SHILL_PIN_SOL } from "../lib/shill/types";
import { ROCKET_PACKS } from "../lib/launch/boost";
import { seatSol } from "../lib/seat";
import { emptyState } from "../lib/store";
import { PROTOCOL_FEE_BPS } from "../lib/config";
import { mergePartnerFeeMaps } from "../lib/launch/dbc";
import { sphaLaunchMints } from "../lib/token/omics";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("profit catalog", () => {
  it("pins live and pad skims at 1%, not the 10 bps paper pair model", () => {
    assert.equal(LIVE_SKIM_BPS, 100);
    assert.equal(PAD_CURVE_BPS, 100);
    assert.equal(SWAP_FEE_BPS, 100);
    assert.equal(PAD_SWAP_FEE_BPS, 100);
    assert.equal(PROTOCOL_FEE_BPS, 10);
    assert.equal(liveSwapFeeSol(1), 0.01);
    assert.equal(liveClipFeeSol(100, 100), 0.01);
    assert.equal(splitPadSpend(1).feeSol, 0.01);
  });

  it("splits pad fees 50/25/25 and referred 50/12.5/12.5/25", () => {
    const fee = feeOn(1);
    assert.equal(fee, 0.01);
    const plain = splitFee(fee, false);
    assert.equal(plain.dev, 0.005);
    assert.equal(plain.owner, 0.0025);
    assert.equal(plain.treasury, 0.0025);
    const ref = splitFee(fee, true);
    assert.equal(ref.dev, 0.005);
    assert.equal(ref.referral, 0.00125);
    assert.equal(ref.owner, 0.00125);
    assert.equal(ref.treasury, 0.0025);
  });

  it("prices seats, pins, and boost packs", () => {
    assert.equal(seatSol("live"), 0.1);
    assert.equal(seatSol("lev"), 0.15);
    assert.equal(SHILL_PIN_SOL, 0.2);
    assert.deepEqual(
      ROCKET_PACKS.map((p) => [p.rockets, p.sol]),
      [
        [10, 0.5],
        [30, 1],
        [100, 2],
        [500, 3],
      ],
    );
  });

  it("builds a desk that sends pad, pin, boost, and seat SOL to treasury or owner", () => {
    const s = emptyState();
    s.ownerWallet = "2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma";
    s.launch = {
      ...s.launch!,
      ownerWallet: s.ownerWallet,
      ownerEarningsSol: 0.4,
      treasuryFeesSol: 0.2,
      coins: [],
      accounts: {},
      boosts: [{ house: false, paidSol: 1 } as never],
    };
    if (!s.launch.boosts) s.launch.boosts = [];
    s.shill = {
      ...s.shill!,
      pins: [{ house: false, paidSol: 0.2, endsAt: Date.now() + 3_600_000 } as never],
    };
    s.users = [
      {
        pubkey: "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o",
        plan: "live",
        lastPaidAt: Date.now(),
        createdAt: 1,
        lastSeen: 1,
        alertsEnabled: false,
      },
    ];
    const p = buildProfitDesk(s);
    assert.equal(p.liveSkimBps, 100);
    assert.equal(p.accrued.ownerSol, 0.4);
    assert.ok(p.accrued.treasurySol >= 0.2 + 0.2 + 1 + 0.1 - 1e-9);
    assert.ok(p.streams.every((row) => row.walletPk));
    const treas = p.streams.filter((row) => row.wallet === "treasury");
    assert.ok(treas.some((row) => row.id === "desk"));
    assert.ok(treas.some((row) => row.id === "seat"));
    const pin = p.streams.find((row) => row.id === "pin");
    const boost = p.streams.find((row) => row.id === "boost");
    assert.ok(pin?.rate.includes("50%"));
    assert.ok(boost?.rate.includes("50%"));
    assert.equal(p.pinBoostSplit.owner, "50%");
    assert.equal(p.claimable.ownerReadySol, 0);
    assert.equal(p.accrued.ownerSol, 0.4);
  });

  it("does not double-count booked swap 1% into the treasury total", () => {
    const s = emptyState();
    s.launch = {
      ...s.launch!,
      ownerEarningsSol: 0.005,
      treasuryFeesSol: 0.005,
      swapFeesSol: 0.01,
      coins: [],
      accounts: {},
    };
    const p = buildProfitDesk(s);
    assert.equal(p.accrued.treasurySol, 0.005);
    assert.equal(p.streams.find((row) => row.id === "swap")?.accruedSol, 0.01);
  });

  it("adds dedicated 200M partner fees on top of pad-config totals", () => {
    const pad = {
      unclaimedSol: 2,
      totalSol: 4,
      byMint: {
        Pad111111111111111111111111111111111111111: {
          creatorFeesSol: 2,
          creatorUnclaimedSol: 1,
          partnerFeesSol: 4,
          partnerUnclaimedSol: 2,
        },
      },
    };
    const extra = {
      DC3c2a3H1mDggE5fVPVkPs6p4sSibLghQxTsMrfpZJDJ: {
        creatorFeesSol: 1,
        creatorUnclaimedSol: 1,
        partnerFeesSol: 2,
        partnerUnclaimedSol: 1,
      },
    };
    const merged = mergePartnerFeeMaps(pad, extra);
    assert.equal(merged.unclaimedSol, 3);
    assert.equal(merged.totalSol, 6);
    assert.equal(merged.byMint.DC3c2a3H1mDggE5fVPVkPs6p4sSibLghQxTsMrfpZJDJ?.partnerUnclaimedSol, 1);
    const again = mergePartnerFeeMaps(merged, extra);
    assert.equal(again.unclaimedSol, 3);
    const onchain = readFileSync(path.join(process.cwd(), "src/lib/profit/onchain.ts"), "utf8");
    assert.match(onchain, /partnerTotalsWithMints/);
    assert.match(onchain, /sphaLaunchMints/);
    const claim = readFileSync(path.join(process.cwd(), "src/app/api/admin/claim/route.ts"), "utf8");
    assert.match(claim, /sphaLaunchMints\(state\)/);
    assert.deepEqual(sphaLaunchMints({ sphaTestLaunch: { mint: "DC3c2a3H1mDggE5fVPVkPs6p4sSibLghQxTsMrfpZJDJ" } }), [
      "DC3c2a3H1mDggE5fVPVkPs6p4sSibLghQxTsMrfpZJDJ",
    ]);
  });
});
