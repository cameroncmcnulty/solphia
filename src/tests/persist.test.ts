import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_FUND, DEFAULT_OWNER, DEFAULT_TREASURY, LIVE_TRADING, TREASURY } from "../lib/config";
import { durableKind } from "../lib/persist";
import { treasuryAddress } from "../lib/treasury";
import { applyOpsConfig, emptyState, mergeSphaSocials } from "../lib/store";
import { socialHref } from "../lib/launch/links";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("treasury default", () => {
  it("pins the founder treasury when env/state are empty", () => {
    assert.equal(DEFAULT_TREASURY, "J5gf13obSKq41ff91ejGSWiCE3kqatc6N7nUCan5ArYS");
    assert.equal(DEFAULT_OWNER, "BdPJxSmyeShh9erdUdikru9bYaKYqW5KT1hQph59n1Wt");
    assert.equal(DEFAULT_FUND, "f6PTXuKgL3hWUpToTEc5bfqggqaCe1FJtLn8rJeHiWm");
    assert.ok(TREASURY.length >= 32);
    const addr = treasuryAddress();
    assert.ok(addr.length >= 32);
  });

  it("reports filesystem store when no Upstash/Blob env is set in tests", () => {
    assert.equal(durableKind(), "fs");
  });

  it("does not keep a stale liveTrading false on a fresh desk", () => {
    assert.equal(LIVE_TRADING, true);
    const s = emptyState();
    assert.equal(s.liveTrading, undefined);
    assert.equal(s.liveV, 2);
  });
});

describe("ops overlay", () => {
  it("applies newer $SPHA socials from durable ops onto a stale instance", () => {
    const local = emptyState();
    local.opsUpdatedAt = 1;
    local.sphaSocials = { x: "", telegram: "", discord: "", website: "" };
    const dirty = applyOpsConfig(local, {
      opsUpdatedAt: 2,
      sphaSocials: { x: "https://x.com/solphia", telegram: "https://t.me/solphia", discord: "https://discord.gg/solphia" },
      sphaMint: "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o",
    });
    assert.equal(dirty, true);
    assert.equal(local.sphaSocials?.x, "https://x.com/solphia");
    assert.equal(local.sphaSocials?.telegram, "https://t.me/solphia");
    assert.equal(local.sphaMint, "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o");
  });

  it("dual-writes login accounts onto their own durable key", async () => {
    const { readFileSync } = await import("node:fs");
    const persist = readFileSync(new URL("../lib/persist.ts", import.meta.url), "utf8");
    assert.match(persist, /loginAccounts: "solphia:login-accounts"/);
    const store = readFileSync(new URL("../lib/store.ts", import.meta.url), "utf8");
    assert.match(store, /overlayLoginAccounts\(mem/);
    assert.match(store, /persistLoginAccounts\(next\)/);
    assert.match(store, /mergeLoginAccounts/);
    assert.match(store, /LOGIN_PULL_MS/);
    assert.match(store, /export async function peekLoginAccount/);
    const me = readFileSync(new URL("../app/api/auth/me/route.ts", import.meta.url), "utf8");
    assert.match(me, /peekLoginAccount/);
    assert.equal(me.includes("readyState"), false);
  });

  it("does not ship unused desk shells", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    for (const f of [
      "src/components/TerminalView.tsx",
      "src/components/TerminalClient.tsx",
      "src/components/TokenTable.tsx",
      "src/components/CircleSwap.tsx",
      "src/components/TickerCharts.tsx",
      "src/components/WalletDesk.tsx",
      "src/components/ChatDock.tsx",
      "src/components/OrbitTickers.tsx",
      "src/components/PumpLoop.tsx",
      "src/components/SafetyBadge.tsx",
      "src/components/LivePnl.tsx",
      "src/components/ToolsSheet.tsx",
      "src/components/SparkCandles.tsx",
      "src/components/HoverMarks.tsx",
      "src/components/Cursor.tsx",
      "src/components/auth/TotpSettings.tsx",
      "src/components/auth/BotCheck.tsx",
    ]) {
      assert.equal(existsSync(join(process.cwd(), f)), false, f);
    }
  });

  it("does not clobber a newer local save with stale remote ops", () => {
    const local = emptyState();
    local.opsUpdatedAt = 9;
    local.sphaSocials = { x: "https://x.com/fresh", telegram: "", discord: "", website: "" };
    const dirty = applyOpsConfig(local, {
      opsUpdatedAt: 2,
      sphaSocials: { x: "https://x.com/stale", telegram: "", discord: "" },
    });
    assert.equal(dirty, false);
    assert.equal(local.sphaSocials?.x, "https://x.com/fresh");
  });

  it("does not let empty remote socials wipe filled local when ops is newer", () => {
    const local = emptyState();
    local.opsUpdatedAt = 5;
    local.sphaSocials = { x: "https://x.com/solphia", telegram: "https://t.me/solphia", discord: "", website: "" };
    const dirty = applyOpsConfig(local, {
      opsUpdatedAt: 9,
      sphaSocials: { x: "", telegram: "", discord: "", website: "" },
    });
    assert.equal(local.sphaSocials?.x, "https://x.com/solphia");
    assert.equal(local.sphaSocials?.telegram, "https://t.me/solphia");
    assert.equal(dirty, false);
  });

  it("lets a newer stamped empty save clear socials", () => {
    const local = emptyState();
    local.opsUpdatedAt = 5;
    local.sphaSocialsAt = 5;
    local.sphaSocials = { x: "https://x.com/solphia", telegram: "https://t.me/solphia", discord: "", website: "" };
    const dirty = applyOpsConfig(local, {
      opsUpdatedAt: 9,
      sphaSocialsAt: 10,
      sphaSocials: { x: "", telegram: "", discord: "", website: "" },
    });
    assert.equal(dirty, true);
    assert.equal(local.sphaSocials?.x, "");
    assert.equal(local.sphaSocials?.telegram, "");
    assert.equal(local.sphaSocialsAt, 10);
  });

  it("merges filled fields when social stamps are equal", () => {
    const merged = mergeSphaSocials(
      { x: "https://x.com/solphia", telegram: "", discord: "", website: "", at: 3 },
      { x: "", telegram: "https://t.me/solphia", discord: "", website: "", at: 3 },
    );
    assert.equal(merged.x, "https://x.com/solphia");
    assert.equal(merged.telegram, "https://t.me/solphia");
    assert.equal(merged.at, 3);
  });

  it("dual-writes $SPHA socials onto their own durable key", () => {
    const persist = readFileSync(new URL("../lib/persist.ts", import.meta.url), "utf8");
    assert.match(persist, /sphaSocials: "solphia:spha-socials"/);
    const store = readFileSync(new URL("../lib/store.ts", import.meta.url), "utf8");
    assert.match(store, /persistSphaSocials/);
    assert.match(store, /overlaySphaSocials/);
    assert.match(store, /persistOpsBlob/);
    const admin = readFileSync(new URL("../app/api/admin/route.ts", import.meta.url), "utf8");
    assert.match(admin, /sphaSocialsAt = Date\.now\(\)/);
  });
});

describe("spha social links", () => {
  it("turns handles and URLs into https links", () => {
    assert.equal(socialHref("x", "@solphia"), "https://x.com/solphia");
    assert.equal(socialHref("x", "https://twitter.com/solphia"), "https://x.com/solphia");
    assert.equal(socialHref("telegram", "t.me/solphia"), "https://t.me/solphia");
    assert.equal(socialHref("telegram", "https://t.me/+AbC123_xyz"), "https://t.me/+AbC123_xyz");
    assert.equal(socialHref("discord", "discord.gg/solphia"), "https://discord.gg/solphia");
    assert.equal(socialHref("discord", "https://discord.com/invite/solphia"), "https://discord.gg/solphia");
    assert.equal(socialHref("x", ""), "");
    assert.equal(socialHref("x", "javascript:alert(1)"), "");
  });

  it("hides empty social icons on the token page and previews live links in admin", () => {
    const socials = readFileSync(join(process.cwd(), "src/components/SphaSocials.tsx"), "utf8");
    assert.match(socials, /socialHref\("x"/);
    assert.match(socials, /if \(!links\.length\) return null/);
    assert.match(socials, /SocialMarks/);
    assert.equal(socials.includes("coming soon"), false);
    const marks = readFileSync(join(process.cwd(), "src/components/SocialMarks.tsx"), "utf8");
    assert.match(marks, /fillRule="evenodd"/);
    assert.match(marks, /M14\.234 10\.162/);
    assert.match(marks, /M20\.317 4\.3698/);
    const admin = readFileSync(join(process.cwd(), "src/components/admin/sections/Spha.tsx"), "utf8");
    assert.match(admin, /SphaSocials/);
    assert.match(admin, /PREVIEW/);
    const token = readFileSync(join(process.cwd(), "src/app/token/page.tsx"), "utf8");
    assert.match(token, /SphaSocials/);
  });
});
