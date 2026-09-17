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

  it("splits pad fees 50/25/25 and referred 50/25/12.5/12.5", () => {
    const fee = feeOn(1);
    assert.equal(fee, 0.01);
    const plain = splitFee(fee, false);
    assert.equal(plain.dev, 0.005);
    assert.equal(plain.owner, 0.0025);
    assert.equal(plain.treasury, 0.0025);
    const ref = splitFee(fee, true);
    assert.equal(ref.dev, 0.005);
    assert.equal(ref.referral, 0.0025);
    assert.equal(ref.owner, 0.00125);
    assert.equal(ref.treasury, 0.00125);
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
  });
});
