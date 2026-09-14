import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { buildAdminDesk } from "@/lib/admin/desk";
import { grantFounder, revokeFounder } from "@/lib/access";
import { isSolanaAddress, isEmail, clientIp } from "@/lib/security";
import { lockedAuto } from "@/lib/auto";
import { runBacktest } from "@/lib/pair/backtest";
import { loadBacktestTape } from "@/lib/pair/backtestTape";
import { mutateState, audit, pushBounded, readyState, loadAllTraders, deleteTrader, withLaunch, saveTrader } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import { setUsername } from "@/lib/launch/username";
import { launchError } from "@/lib/launch/errors";
import { socialHref } from "@/lib/launch/links";
import { revokeDelegatedSigner } from "@/lib/live/signer";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const state = await readyState();
  await loadAllTraders(state);
  return NextResponse.json(buildAdminDesk());
}

const Patch = z.object({
  adminWallet: z.string().optional(),
  removeAdminWallet: z.string().optional(),
  treasuryWallet: z.string().nullable().optional(),
  ownerWallet: z.string().nullable().optional(),
  devWallet: z.string().nullable().optional(),
  sphaMint: z.string().nullable().optional(),
  foundationWallet: z.string().nullable().optional(),
  airdropWallet: z.string().nullable().optional(),
  lpWallet: z.string().nullable().optional(),
  sphaNetwork: z.enum(["devnet", "mainnet-beta"]).optional(),
  sphaSocials: z
    .object({
      x: z.string().max(160).optional(),
      telegram: z.string().max(160).optional(),
      discord: z.string().max(160).optional(),
      website: z.string().max(160).optional(),
    })
    .optional(),
  liveTrading: z.boolean().optional(),
  publishLiveWallet: z.boolean().optional(),
  traderLive: z
    .object({
      owner: z.string(),
      leverage: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
      mode: z.enum(["paper", "live"]).optional(),
    })
    .optional(),
  runBacktest: z.boolean().optional(),
  user: z
    .object({
      pubkey: z.string(),
      username: z.string().max(32).optional(),
      email: z.string().max(120).nullable().optional(),
      notes: z.string().max(500).nullable().optional(),
      grantAdmin: z.boolean().optional(),
      comped: z.boolean().optional(),
      alertsEnabled: z.boolean().optional(),
      clearUsername: z.boolean().optional(),
      delete: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const body = parsed.data;
  const ip = clientIp(req);

  if (body.adminWallet) {
    if (!isSolanaAddress(body.adminWallet)) return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
    await mutateState((s) => {
      grantFounder(s, body.adminWallet!);
      pushBounded(s.audit, audit("admin", "admin_wallet", body.adminWallet!, ip), 400);
    });
  }
  if (body.removeAdminWallet) {
    if (!isSolanaAddress(body.removeAdminWallet)) return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
    await mutateState((s) => {
      revokeFounder(s, body.removeAdminWallet!);
      pushBounded(s.audit, audit("admin", "admin_wallet_remove", body.removeAdminWallet!, ip), 400);
    });
  }
  if (body.treasuryWallet !== undefined) {
    const next = (body.treasuryWallet || "").trim();
    if (next && !isSolanaAddress(next)) return NextResponse.json({ error: "bad_treasury" }, { status: 400 });
    await mutateState((s) => {
      s.treasuryWallet = next;
      pushBounded(s.audit, audit("admin", "treasury", next ? next : "cleared", ip), 400);
    });
  }
  if (body.ownerWallet !== undefined) {
    const next = (body.ownerWallet || "").trim();
    if (next && !isSolanaAddress(next)) return NextResponse.json({ error: "bad_owner_wallet" }, { status: 400 });
    await mutateState((s) => {
      if (!s.launch) s.launch = emptyLaunchBook();
      s.ownerWallet = next;
      s.launch.ownerWallet = next;
      pushBounded(s.audit, audit("admin", "owner_wallet", next ? next : "cleared", ip), 400);
    });
  }
  if (body.devWallet !== undefined) {
    const next = (body.devWallet || "").trim();
    if (next && !isSolanaAddress(next)) return NextResponse.json({ error: "bad_dev_wallet" }, { status: 400 });
    await mutateState((s) => {
      s.devWallet = next;
      pushBounded(s.audit, audit("admin", "dev_wallet", next ? next : "cleared", ip), 400);
    });
  }
  if (body.sphaMint !== undefined) {
    const next = (body.sphaMint || "").trim();
    if (next && !isSolanaAddress(next)) return NextResponse.json({ error: "bad_spha_mint" }, { status: 400 });
    await mutateState((s) => {
      s.sphaMint = next;
      pushBounded(s.audit, audit("admin", "spha_mint", next ? next : "cleared", ip), 400);
    });
  }
  for (const key of ["foundationWallet", "airdropWallet", "lpWallet"] as const) {
    if (body[key] === undefined) continue;
    const next = (body[key] || "").trim();
    if (next && !isSolanaAddress(next)) return NextResponse.json({ error: `bad_${key}` }, { status: 400 });
    await mutateState((s) => {
      s[key] = next;
      pushBounded(s.audit, audit("admin", key, next ? next : "cleared", ip), 400);
    });
  }
  if (body.sphaNetwork) {
    await mutateState((s) => {
      s.sphaNetwork = body.sphaNetwork;
      pushBounded(s.audit, audit("admin", "spha_network", body.sphaNetwork!, ip), 400);
    });
  }
  if (body.sphaSocials) {
    await mutateState((s) => {
      s.sphaSocials = {
        x: socialHref("x", body.sphaSocials?.x),
        telegram: socialHref("telegram", body.sphaSocials?.telegram),
        discord: socialHref("discord", body.sphaSocials?.discord),
      };
      pushBounded(s.audit, audit("admin", "spha_socials", "updated", ip), 400);
    });
  }
  if (typeof body.liveTrading === "boolean") {
    await mutateState((s) => {
      s.liveTrading = body.liveTrading;
      pushBounded(s.audit, audit("admin", "live_flag", String(body.liveTrading), ip), 400);
    });
  }
  if (body.runBacktest) {
    try {
      const tape = await loadBacktestTape();
      if (tape.sol.length < 120 || tape.spy.length < 80) {
        return NextResponse.json({ error: "Not enough history to backtest.", desk: buildAdminDesk() }, { status: 400 });
      }
      const report = runBacktest(tape, undefined, 1);
      await mutateState((s) => {
        s.backtest = report;
      });
      const lev2 = runBacktest(tape, undefined, 2);
      await mutateState((s) => {
        s.backtestLev2 = lev2;
      });
      const lev3 = runBacktest(tape, undefined, 3);
      await mutateState((s) => {
        s.backtestLev3 = lev3;
        pushBounded(
          s.audit,
          audit("admin", "backtest", `1x ${(report.pnlPct * 100).toFixed(1)}% · 2x ${(lev2.pnlPct * 100).toFixed(1)}% · 3x ${(lev3.pnlPct * 100).toFixed(1)}%`, ip),
          400,
        );
      });
      return NextResponse.json({
        ok: true,
        note: `Spot ${(report.pnlPct * 100).toFixed(1)}% · 2x ${(lev2.pnlPct * 100).toFixed(1)}% · 3x ${(lev3.pnlPct * 100).toFixed(1)}% after fees`,
        desk: buildAdminDesk(),
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Backtest failed.", desk: buildAdminDesk() },
        { status: 400 },
      );
    }
  }
  if (typeof body.publishLiveWallet === "boolean") {
    await mutateState((s) => {
      s.publishLiveWallet = body.publishLiveWallet;
      pushBounded(s.audit, audit("admin", "publish_live", String(body.publishLiveWallet), ip), 400);
    });
    return NextResponse.json({ ok: true, note: body.publishLiveWallet ? "Public live stats on." : "Public live stats off.", desk: buildAdminDesk() });
  }
  if (body.traderLive) {
    const pk = body.traderLive.owner;
    if (!isSolanaAddress(pk)) return NextResponse.json({ error: "bad_wallet", desk: buildAdminDesk() }, { status: 400 });
    const state = await readyState();
    await loadAllTraders(state);
    const t = state.traders[pk];
    if (!t) return NextResponse.json({ error: "missing", message: "No book for that wallet.", desk: buildAdminDesk() }, { status: 400 });
    t.auto = lockedAuto({
      ...t.auto,
      mode: body.traderLive.mode || t.auto?.mode,
      leverage: body.traderLive.leverage || t.auto?.leverage,
    });
    await saveTrader(t);
    await mutateState((s) => {
      pushBounded(s.audit, audit("admin", "trader_live", `${pk} ${t.auto.mode} ${t.auto.leverage}x`, ip), 400);
    });
    return NextResponse.json({ ok: true, note: `${t.auto.mode} · SOL ${t.auto.leverage}×`, desk: buildAdminDesk() });
  }
  if (body.user) {
    const u = body.user;
    if (!isSolanaAddress(u.pubkey)) return NextResponse.json({ error: "bad_wallet", desk: buildAdminDesk() }, { status: 400 });
    if (u.delete) {
      await withLaunch((s) => {
        if (s.launch?.accounts) delete s.launch.accounts[u.pubkey];
        s.users = (s.users || []).filter((row) => row.pubkey !== u.pubkey);
        revokeFounder(s, u.pubkey);
        pushBounded(s.audit, audit("admin", "user_delete", u.pubkey, ip), 400);
      }, true);
      await deleteTrader(u.pubkey);
      try {
        await revokeDelegatedSigner(u.pubkey);
      } catch {
        /* missing key is fine */
      }
      return NextResponse.json({ ok: true, note: "Account deleted.", desk: buildAdminDesk() });
    }
    if (u.email != null && u.email !== "" && !isEmail(u.email)) {
      return NextResponse.json({ error: "bad_email", message: launchError("bad_email"), desk: buildAdminDesk() }, { status: 400 });
    }
    const named = await withLaunch((s) => {
      if (!s.launch) s.launch = emptyLaunchBook();
      if (u.clearUsername) {
        const r = setUsername(s.launch, u.pubkey, "");
        if (!r.ok) return r;
      } else if (typeof u.username === "string") {
        const r = setUsername(s.launch, u.pubkey, u.username);
        if (!r.ok) return r;
      }
      if (typeof u.notes === "string" || u.notes === null) {
        const acc = s.launch.accounts[u.pubkey] || (s.launch.accounts[u.pubkey] = { pubkey: u.pubkey, referralRewardsSol: 0 });
        acc.notes = u.notes || undefined;
      }
      let user = (s.users || []).find((row) => row.pubkey === u.pubkey);
      if (!user) {
        user = {
          pubkey: u.pubkey,
          createdAt: Date.now(),
          lastSeen: Date.now(),
          alertsEnabled: true,
        };
        s.users.push(user);
      }
      if (typeof u.username === "string") user.username = u.clearUsername ? undefined : u.username || undefined;
      if (u.clearUsername) user.username = undefined;
      if (u.email !== undefined) user.email = u.email || undefined;
      if (u.notes !== undefined) user.notes = u.notes || undefined;
      if (typeof u.alertsEnabled === "boolean") user.alertsEnabled = u.alertsEnabled;
      if (typeof u.comped === "boolean") {
        user.comped = u.comped;
        if (u.comped) {
          user.plan = user.plan === "paper" ? "live" : user.plan;
          user.subscribedUntil = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;
        } else if (!s.adminWallets?.includes(u.pubkey)) {
          user.subscribedUntil = Date.now();
        }
      }
      if (typeof u.grantAdmin === "boolean") {
        if (u.grantAdmin) grantFounder(s, u.pubkey);
        else revokeFounder(s, u.pubkey);
      }
      pushBounded(s.audit, audit("admin", "user_edit", u.pubkey, ip), 400);
      return { ok: true as const };
    }, true);
    if (named && "ok" in named && !named.ok) {
      const code = (named as { error?: string }).error || "failed";
      return NextResponse.json({ error: code, message: launchError(code), desk: buildAdminDesk() }, { status: 400 });
    }
    return NextResponse.json({ ok: true, note: "Account updated.", desk: buildAdminDesk() });
  }
  return NextResponse.json({ ok: true, desk: buildAdminDesk() });
}
