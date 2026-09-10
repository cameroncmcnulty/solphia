import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { buildAdminDesk } from "@/lib/admin/desk";
import { generatePromoPack, settlePendingPromo } from "@/lib/admin/promo";
import { grantFounder, revokeFounder } from "@/lib/access";
import { isSolanaAddress, isEmail, clientIp } from "@/lib/security";
import { emptyBook } from "@/lib/auto";
import { runBacktest } from "@/lib/pair/backtest";
import { loadBacktestTape } from "@/lib/pair/backtestTape";
import { mutateState, audit, pushBounded, readyState, loadAllTraders, deleteTrader, withLaunch } from "@/lib/store";
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
  try {
    await settlePendingPromo(0);
  } catch {
    /* still serve the desk */
  }
  return NextResponse.json(buildAdminDesk());
}

const Patch = z.object({
  adminWallet: z.string().optional(),
  removeAdminWallet: z.string().optional(),
  treasuryWallet: z.string().nullable().optional(),
  ownerWallet: z.string().nullable().optional(),
  sphaSocials: z
    .object({
      x: z.string().max(160).optional(),
      telegram: z.string().max(160).optional(),
      discord: z.string().max(160).optional(),
    })
    .optional(),
  liveTrading: z.boolean().optional(),
  generatePromo: z.boolean().optional(),
  contentHint: z.string().max(280).optional(),
  resetPaper: z.boolean().optional(),
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
  if (body.resetPaper) {
    await mutateState((s) => {
      const start = s.paper?.startingUsd || 1000;
      s.paper = emptyBook(start);
      for (const t of Object.values(s.traders || {})) {
        if (t.auto?.mode === "live") continue;
        t.book = emptyBook(t.book?.startingUsd || start);
        t.auto = { ...t.auto, armedAt: Date.now(), armed: true };
      }
      pushBounded(s.audit, audit("admin", "paper_reset", "new paper session", ip), 400);
    });
    return NextResponse.json({ ok: true, note: "Paper session restarted.", desk: buildAdminDesk() });
  }
  if (body.generatePromo) {
    const result = await generatePromoPack({ force: true, hint: body.contentHint });
    if (result.error && result.made === 0) {
      return NextResponse.json({ error: result.error, note: result.note, desk: buildAdminDesk() }, { status: 400 });
    }
    return NextResponse.json({ ok: true, made: result.made, note: result.note, desk: buildAdminDesk() });
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
