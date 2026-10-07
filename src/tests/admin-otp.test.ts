import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { consumeAdminOtp, DEFAULT_ADMIN_OTP_EMAIL, maskEmail, startAdminOtp } from "../lib/admin/otp";
import { hashOtp, otpMatch } from "../lib/auth/otp";
import { emptyState } from "../lib/store";
import { mailerKind, mailConfigured, mailFrom, mailOffHint } from "../lib/email/send";

describe("admin otp", () => {
  it("defaults to CameronCmcnulty@gmail.com and hashes the code", () => {
    const s = emptyState();
    const started = startAdminOtp(s);
    assert.equal(started.ok, true);
    if (!started.ok) return;
    assert.equal(started.email, DEFAULT_ADMIN_OTP_EMAIL.toLowerCase());
    assert.ok(s.adminOtpPending);
    assert.equal(s.adminOtpPending?.otpHash, hashOtp(started.email, started.otp));
    assert.equal(otpMatch(started.email, started.otp, s.adminOtpPending!.otpHash), true);
    const bad = consumeAdminOtp(s, "000000");
    assert.equal(bad.ok, false);
    const ok = consumeAdminOtp(s, started.otp);
    assert.equal(ok.ok, true);
    assert.equal(s.adminOtpPending, null);
  });

  it("masks the inbox", () => {
    assert.equal(maskEmail("CameronCmcnulty@gmail.com").includes("gmail.com"), true);
    assert.equal(maskEmail("CameronCmcnulty@gmail.com").includes("Cameron"), false);
  });

  it("uses an editable admin inbox", () => {
    const s = emptyState();
    s.adminOtpEmail = "ops@solphia.io";
    const started = startAdminOtp(s);
    assert.equal(started.ok, true);
    if (!started.ok) return;
    assert.equal(started.email, "ops@solphia.io");
  });

  it("accepts a pasted code with spaces and keeps the digits readable in mail", () => {
    const s = emptyState();
    const started = startAdminOtp(s);
    assert.equal(started.ok, true);
    if (!started.ok) return;
    const spaced = started.otp.split("").join(" ");
    assert.equal(consumeAdminOtp(s, spaced).ok, true);
    const html = readFileSync(join(process.cwd(), "src/lib/admin/otp.ts"), "utf8");
    assert.match(html, /background:#ffffff/);
    assert.match(html, /Dashboard one-time code/);
  });

  it("writes the admin code to its own durable key so verify can run on another instance", () => {
    const persist = readFileSync(join(process.cwd(), "src/lib/persist.ts"), "utf8");
    const login = readFileSync(join(process.cwd(), "src/app/api/admin/login/route.ts"), "utf8");
    const otp = readFileSync(join(process.cwd(), "src/lib/auth/otp.ts"), "utf8");
    assert.match(persist, /adminOtp:\s*"solphia:admin-otp"/);
    assert.match(login, /await pullAdminOtp\(s\)/);
    assert.match(login, /await saveAdminOtp\(/);
    assert.match(otp, /function otpSecret\(\)/);
  });
});

describe("mailer", () => {
  function snapMailEnv() {
    return {
      dkim: process.env.SOLPHIA_DKIM_PRIVATE_KEY,
      host: process.env.SOLPHIA_MAIL_HOST,
      port: process.env.SOLPHIA_MAIL_PORT,
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      resend: process.env.RESEND_API_KEY,
      agent: process.env.AGENTMAIL_API_KEY,
      inbox: process.env.AGENTMAIL_INBOX,
      mailUser: process.env.MAIL_USER,
      mailPass: process.env.MAIL_APP_PASSWORD,
    };
  }
  function restoreMailEnv(prev: ReturnType<typeof snapMailEnv>) {
    const put = (k: string, v: string | undefined) => {
      if (v) process.env[k] = v;
      else delete process.env[k];
    };
    put("SOLPHIA_DKIM_PRIVATE_KEY", prev.dkim);
    put("SOLPHIA_MAIL_HOST", prev.host);
    put("SOLPHIA_MAIL_PORT", prev.port);
    put("SMTP_HOST", prev.smtpHost);
    put("SMTP_USER", prev.smtpUser);
    put("SMTP_PASS", prev.smtpPass);
    put("RESEND_API_KEY", prev.resend);
    put("AGENTMAIL_API_KEY", prev.agent);
    put("AGENTMAIL_INBOX", prev.inbox);
    put("MAIL_USER", prev.mailUser);
    put("MAIL_APP_PASSWORD", prev.mailPass);
  }

  it("is off without a Solphia DKIM key, even if leftover vendor env is set", () => {
    const prev = snapMailEnv();
    delete process.env.SOLPHIA_DKIM_PRIVATE_KEY;
    process.env.SMTP_HOST = "email-smtp.us-east-1.amazonaws.com";
    process.env.SMTP_USER = "AKIAEXAMPLE";
    process.env.SMTP_PASS = "ses-smtp-pass";
    process.env.RESEND_API_KEY = "re_test";
    process.env.AGENTMAIL_API_KEY = "am_test";
    process.env.MAIL_USER = "hello@gmail.com";
    process.env.MAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    assert.equal(mailerKind(), null);
    assert.equal(mailConfigured(), false);
    restoreMailEnv(prev);
  });

  it("picks the in-house mailer when DKIM is set and ignores Gmail / SES / AgentMail", () => {
    const prev = snapMailEnv();
    process.env.SOLPHIA_DKIM_PRIVATE_KEY =
      "-----BEGIN PRIVATE KEY-----\\n" + "A".repeat(80) + "\\n-----END PRIVATE KEY-----";
    process.env.AGENTMAIL_API_KEY = "am_test";
    process.env.SMTP_HOST = "email-smtp.us-east-1.amazonaws.com";
    process.env.RESEND_API_KEY = "re_test";
    process.env.MAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    assert.equal(mailerKind(), "solphia");
    assert.match(mailFrom(), /otp@solphia\.io/);
    delete process.env.SOLPHIA_DKIM_PRIVATE_KEY;
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_USER = "hello@gmail.com";
    process.env.SMTP_PASS = "app-pass";
    assert.equal(mailerKind(), null);
    restoreMailEnv(prev);
  });

  it("does not tell operators to use a Gmail app password or SES", () => {
    const login = readFileSync(join(process.cwd(), "src/app/api/admin/login/route.ts"), "utf8");
    const otp = readFileSync(join(process.cwd(), "src/app/api/auth/otp/route.ts"), "utf8");
    const send = readFileSync(join(process.cwd(), "src/lib/email/send.ts"), "utf8");
    assert.equal(login.includes("MAIL_APP_PASSWORD"), false);
    assert.equal(otp.includes("MAIL_APP_PASSWORD"), false);
    assert.equal(send.includes("smtp.gmail.com"), false);
    assert.equal(send.includes("amazonses"), false);
    assert.equal(send.includes("nodemailer"), false);
    assert.equal(send.includes("api.agentmail.to"), false);
    assert.match(send, /otp@solphia\.io/);
    assert.match(mailOffHint("admin"), /SOLPHIA_DKIM_PRIVATE_KEY/);
  });
});
