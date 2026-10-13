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

  it("sign-in gate never auto-completes from a leftover /me cookie", () => {
    const gate = readFileSync(new URL("../components/auth/AccountGate.tsx", import.meta.url), "utf8");
    assert.equal(gate.includes("onReady(j.account"), false);
    assert.match(gate, /waitForLogout/);
    assert.match(gate, /acceptAccount\(account\)/);
    assert.match(gate, /peekAccount\(\)\?\.id !== account\.id/);
    assert.match(gate, /flashNotice\("Signed in"\)/);
    const login = gate.slice(gate.indexOf("async function submitEmail"), gate.indexOf("function google()"));
    assert.match(login, /await waitForLogout\(\)/);
    assert.match(login, /\/api\/auth\/login/);
    assert.match(login, /\/api\/auth\/signup/);
    assert.equal(login.includes("/api/auth/otp"), false);
    assert.equal(gate.includes("Email me a code"), false);
    assert.equal(gate.includes("submitOtp"), false);
    assert.match(gate, /Create account/);
    const googleFn = gate.slice(gate.indexOf("function google()"), gate.indexOf("function modeToggle"));
    assert.match(googleFn, /waitForLogout\(\)/);
    assert.match(googleFn, /\/api\/auth\/google\?/);
    const totp = gate.slice(gate.indexOf("async function submitTotpLogin"), gate.indexOf("if (screen === \"totp-setup\")"));
    assert.match(totp, /await waitForLogout\(\)/);
    assert.match(totp, /action: "verify"/);
  });

  it("host waits for logout before opening the gate and keeps the account the gate just signed in", () => {
    const host = readFileSync(new URL("../components/wallet/WalletHost.tsx", import.meta.url), "utf8");
    assert.match(host, /waitForLogout\(\)\.then\(\(\) => window\.dispatchEvent\(new Event\(ACCOUNT_GATE\)\)\)/);
    assert.match(host, /waitForLogout\(\)\.then\(\(\) => window\.dispatchEvent\(new Event\(CONNECT_FLOW\)\)\)/);
    assert.match(host, /onReady=\{\(acct\) => afterAccount\(acct\)\}/);
    assert.match(host, /if \(acct\?\.id\) acceptAccount\(acct\)/);
    assert.equal(host.includes("onReady={() => afterAccount()}"), false);
  });

  it("logout POST only clears the session it was asked to end", () => {
    const logout = readFileSync(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8");
    assert.match(logout, /logoutClearsCookie\(cookieId, want\)/);
    assert.match(logout, /readAccountId/);
    const client = readFileSync(new URL("../lib/auth/client.ts", import.meta.url), "utf8");
    assert.match(client, /JSON.stringify\(\{ id: existing\?\.id \|\| lastLogoutId/);
    assert.match(client, /waitForLogout/);
    assert.match(client, /held\.id !== account\.id/);
  });

  it("Google sign-in still uses a same-origin claim and email login still uses the submitted email", () => {
    const cb = readFileSync(new URL("../app/api/auth/google/callback/route.ts", import.meta.url), "utf8");
    assert.match(cb, /\/api\/auth\/claim/);
    assert.match(cb, /setAccountCookie/);
    const login = readFileSync(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
    assert.match(login, /loginEmail\(s, parsed\.data\)/);
    assert.match(login, /setAccountCookie\(res, out\.account\.id\)/);
    const signup = readFileSync(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8");
    assert.match(signup, /verifyBot/);
    assert.match(signup, /createEmailAccount\(s, \{/);
    assert.match(signup, /verified: true/);
    assert.match(signup, /setAccountCookie\(res, out\.account\.id\)/);
    const challenge = readFileSync(new URL("../app/api/auth/challenge/route.ts", import.meta.url), "utf8");
    assert.match(challenge, /turnstileLive\(\)/);
    const totp = readFileSync(new URL("../app/api/auth/totp/route.ts", import.meta.url), "utf8");
    assert.match(totp, /readTotpPendingId/);
    assert.match(totp, /setAccountCookie\(res, out\.account\.id\)/);
  });
});
