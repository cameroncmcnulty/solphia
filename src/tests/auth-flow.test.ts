import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { logoutClearsCookie } from "../lib/auth/session";

describe("auth flow", () => {
  it("late logout of account A does not wipe a newer cookie for account B", () => {
    assert.equal(logoutClearsCookie("acct_a", "acct_a"), true);
    assert.equal(logoutClearsCookie("acct_b", "acct_a"), false);
    assert.equal(logoutClearsCookie(null, "acct_a"), true);
    assert.equal(logoutClearsCookie("acct_a", ""), true);
    assert.equal(logoutClearsCookie("acct_a", null), true);
  });

  it("email and Google sign-in routes are retired", () => {
    const signup = readFileSync(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8");
    assert.match(signup, /retiredAuthBody/);
    assert.match(signup, /410/);
    assert.equal(signup.includes("createEmailAccount"), false);
    const login = readFileSync(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
    assert.match(login, /retiredAuthBody/);
    const google = readFileSync(new URL("../app/api/auth/google/route.ts", import.meta.url), "utf8");
    assert.match(google, /retiredAuthBody/);
    const cb = readFileSync(new URL("../app/api/auth/google/callback/route.ts", import.meta.url), "utf8");
    assert.match(cb, /auth_error.*wallet/);
    assert.equal(cb.includes("upsertGoogleAccount"), false);
    const claim = readFileSync(new URL("../app/api/auth/claim/route.ts", import.meta.url), "utf8");
    assert.match(claim, /retiredAuthBody/);
    const totp = readFileSync(new URL("../app/api/auth/totp/route.ts", import.meta.url), "utf8");
    assert.match(totp, /retiredAuthBody/);
  });

  it("connect waits for logout then opens the wallet onboard, not email/Google", () => {
    const host = readFileSync(new URL("../components/wallet/WalletHost.tsx", import.meta.url), "utf8");
    assert.match(host, /waitForLogout\(\)\.then\(\(\) => window\.dispatchEvent\(new Event\(CONNECT_FLOW\)\)\)/);
    assert.match(host, /WalletOnboard/);
    assert.equal(host.includes("<AccountGate"), false);
    const gate = readFileSync(new URL("../components/auth/AccountGate.tsx", import.meta.url), "utf8");
    assert.match(gate, /WalletOnboard/);
    assert.equal(gate.includes("/api/auth/login"), false);
    assert.equal(gate.includes("/api/auth/signup"), false);
    const onboard = readFileSync(new URL("../components/wallet/WalletOnboard.tsx", import.meta.url), "utf8");
    assert.match(onboard, /startWalletSession/);
    const client = readFileSync(new URL("../lib/auth/client.ts", import.meta.url), "utf8");
    assert.match(client, /\/api\/auth\/wallet-session/);
  });

  it("logout POST only clears the session it was asked to end", () => {
    const logout = readFileSync(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8");
    assert.match(logout, /logoutClearsCookie\(cookieId, want\)/);
    assert.match(logout, /readAccountId/);
    const client = readFileSync(new URL("../lib/auth/client.ts", import.meta.url), "utf8");
    assert.match(client, /JSON.stringify\(\{ id: existing\?\.id \|\| lastLogoutId/);
    assert.match(client, /waitForLogout/);
    assert.match(client, /held\.id !== account\.id/);
    assert.match(client, /lockVault/);
  });

  it("TosGate shows the accept form when a wallet is already connected", () => {
    const gate = readFileSync(new URL("../components/TosGate.tsx", import.meta.url), "utf8");
    assert.match(gate, /startWalletSession/);
    assert.match(gate, /acct && !acct.tosAcceptedAt/);
    assert.match(gate, /setNeed\(true\)/);
    assert.equal(gate.includes("setNeedAccount(true)"), false);
    assert.match(gate, /\/legal#terms/);
    assert.match(gate, /\/legal#privacy/);
    assert.match(gate, /recovery phrase and PIN stay on this device/);
  });

  it("terms and privacy match seed-wallet login and live key delegate", () => {
    const legal = readFileSync(new URL("../app/legal/page.tsx", import.meta.url), "utf8");
    assert.match(legal, /id="terms"/);
    assert.match(legal, /id="privacy"/);
    assert.match(legal, /id="live"/);
    assert.match(legal, /create or import/);
    assert.match(legal, /12-word recovery phrase/);
    assert.match(legal, /encrypted copy of the trading-wallet secret/);
    assert.match(legal, /admin@solphia\.io/);
    assert.equal(legal.includes("never asks for a seed phrase"), false);
    assert.equal(legal.includes("We do not collect seed phrases or private keys"), false);
    assert.equal(legal.includes("Your trading key stays on your phone or computer"), false);
    const footer = readFileSync(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8");
    assert.match(footer, /\/legal#terms/);
    assert.match(footer, /\/legal#privacy/);
    const onboard = readFileSync(new URL("../components/wallet/WalletOnboard.tsx", import.meta.url), "utf8");
    assert.match(onboard, /\/legal#terms/);
    assert.match(onboard, /\/legal#privacy/);
  });

  it("wallet session is the only way to open an account", () => {
    const session = readFileSync(new URL("../app/api/auth/wallet-session/route.ts", import.meta.url), "utf8");
    assert.match(session, /openWalletAccount/);
    assert.match(session, /setAccountCookie/);
    const accounts = readFileSync(new URL("../lib/auth/accounts.ts", import.meta.url), "utf8");
    assert.match(accounts, /export function openWalletAccount/);
    assert.match(accounts, /error: "taken"/);
    const wallets = readFileSync(new URL("../app/api/auth/wallets/route.ts", import.meta.url), "utf8");
    assert.match(wallets, /That wallet already belongs to another account/);
  });
});
