import assert from "node:assert/strict";
import { createHash, createPublicKey, createVerify, generateKeyPairSync } from "node:crypto";
import { createServer } from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import { composeMail, createIdentity, emptyMail, mailAddress, signatureHtml, withSignature } from "../lib/email/desk";
import {
  attachDkim,
  canonicalizeBody,
  canonicalizeHeader,
  dkimPrivateKeyPem,
  dkimReady,
} from "../lib/email/dkim";
import { deliverSolphiaMail } from "../lib/email/mta";
import { assembleRaw, buildMime, envelopeAddr, quotedPrintable } from "../lib/email/rfc5322";
import { mailConfigured, mailerKind, queueEmail } from "../lib/email/send";
import { isThirdPartySmarthost, resolveMxDomain, smtpSend, stuffDots } from "../lib/email/smtp";
import { emptyState } from "../lib/store";

function startFakeSmtp() {
  const messages: string[] = [];
  return new Promise<{ port: number; messages: string[]; close: () => Promise<void> }>((resolve) => {
    const server = net.createServer((sock) => {
      let buf = "";
      let mode: "cmd" | "data" = "cmd";
      let data = "";
      sock.write("220 solphia.test ESMTP\r\n");
      sock.on("data", (chunk) => {
        buf += chunk.toString("utf8");
        if (mode === "data") {
          data += buf;
          buf = "";
          const end = data.indexOf("\r\n.\r\n");
          if (end >= 0) {
            messages.push(data.slice(0, end));
            data = "";
            mode = "cmd";
            sock.write("250 OK\r\n");
          }
          return;
        }
        while (true) {
          const i = buf.indexOf("\r\n");
          if (i < 0) break;
          const line = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const u = line.toUpperCase();
          if (u.startsWith("EHLO") || u.startsWith("HELO")) sock.write("250-solphia.test\r\n250 OK\r\n");
          else if (u.startsWith("MAIL") || u.startsWith("RCPT")) sock.write("250 OK\r\n");
          else if (u.startsWith("DATA")) {
            mode = "data";
            sock.write("354 go\r\n");
          } else if (u.startsWith("QUIT")) {
            sock.write("221 bye\r\n");
            sock.end();
          } else sock.write("250 OK\r\n");
        }
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      resolve({
        port: addr.port,
        messages,
        close: () => new Promise((res, rej) => server.close((err) => (err ? rej(err) : res()))),
      });
    });
  });
}

function testKey() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

function parseDkim(value: string): Record<string, string> {
  const raw = value.replace(/\r?\n[ \t]+/g, "").replace(/[ \t]+/g, " ").trim();
  const tags: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    tags[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return tags;
}

describe("solphia mail", () => {
  it("seeds admin@solphia.io and creates more identities", () => {
    const book = emptyMail();
    assert.ok(book.identities.some((i) => i.local === "admin"));
    assert.ok(book.identities.some((i) => i.local === "otp"));
    assert.equal(mailAddress("admin"), "admin@solphia.io");
    assert.equal(mailAddress("otp"), "otp@solphia.io");
    const r = createIdentity(book, { local: "codes", name: "Codes" });
    assert.equal(r.ok, true);
    const dup = createIdentity(book, { local: "codes" });
    assert.equal(dup.ok, false);
    assert.ok(book.identities.some((i) => i.local === "hello"));
  });

  it("signs outgoing mail with the SPHA mark, not Solana", () => {
    const html = signatureHtml("Solphia", "admin@solphia.io");
    assert.match(html, /spha-mark\.png/);
    assert.doesNotMatch(html, /solana/i);
    const body = withSignature("<p>gm</p>", "Solphia", "admin@solphia.io");
    assert.match(body, /spha-mark\.png/);
    const book = emptyMail();
    const sent = composeMail(book, { fromLocal: "admin", to: "you@x.com", subject: "gm", html: "<p>hi</p>" });
    assert.equal(sent.ok, true);
    if (sent.ok) assert.match(sent.message.html, /spha-mark\.png/);
  });

  it("strips quotes and escaped newlines from the DKIM PEM", () => {
    const prev = process.env.SOLPHIA_DKIM_PRIVATE_KEY;
    process.env.SOLPHIA_DKIM_PRIVATE_KEY =
      '"-----BEGIN PRIVATE KEY-----\\nABCD\\n-----END PRIVATE KEY-----"';
    assert.equal(dkimPrivateKeyPem(), "-----BEGIN PRIVATE KEY-----\nABCD\n-----END PRIVATE KEY-----");
    if (prev) process.env.SOLPHIA_DKIM_PRIVATE_KEY = prev;
    else delete process.env.SOLPHIA_DKIM_PRIVATE_KEY;
  });

  it("builds quoted-printable MIME from otp@solphia.io", () => {
    const mime = buildMime({
      from: "Solphia <otp@solphia.io>",
      to: "you@example.com",
      subject: "Your Solphia code",
      html: "<p>123456</p>",
    });
    assert.equal(mime.envelopeFrom, "otp@solphia.io");
    assert.deepEqual(mime.envelopeTo, ["you@example.com"]);
    assert.equal(envelopeAddr("Solphia <otp@solphia.io>"), "otp@solphia.io");
    assert.match(mime.rawWithoutDkim, /Content-Transfer-Encoding: quoted-printable/);
    assert.match(quotedPrintable("café"), /=C3=A9/);
  });

  it("signs DKIM relaxed/relaxed rsa-sha256 with an ephemeral key", () => {
    const { privateKey, publicKey } = testKey();
    const prev = process.env.SOLPHIA_DKIM_PRIVATE_KEY;
    process.env.SOLPHIA_DKIM_PRIVATE_KEY = privateKey;
    assert.equal(dkimReady(), true);
    const mime = buildMime({
      from: "Solphia <otp@solphia.io>",
      to: "you@example.com",
      subject: "Your Solphia code",
      html: "<p>123456</p>",
    });
    const signed = attachDkim(mime.headers, mime.headerOrder, mime.body);
    const sig = signed.headers["dkim-signature"] || "";
    const tags = parseDkim(sig);
    assert.equal(tags.v, "1");
    assert.equal(tags.a, "rsa-sha256");
    assert.equal(tags.c, "relaxed/relaxed");
    assert.equal(tags.d, "solphia.io");
    assert.equal(tags.s, "solphia");
    const bh = createHash("sha256").update(canonicalizeBody(mime.body)).digest("base64");
    assert.equal(tags.bh, bh);
    const hFields = (tags.h || "").split(":");
    const canon: string[] = [];
    for (const name of hFields) {
      canon.push(canonicalizeHeader(name, mime.headers[name] || ""));
    }
    const signedVal = `v=1; a=rsa-sha256; c=relaxed/relaxed; d=${tags.d}; s=${tags.s}; t=${tags.t}; bh=${tags.bh}; h=${tags.h}; b=`;
    canon.push(canonicalizeHeader("dkim-signature", signedVal));
    const verify = createVerify("RSA-SHA256");
    verify.update(canon.join("\r\n"));
    verify.end();
    assert.equal(verify.verify(createPublicKey(publicKey), Buffer.from(tags.b, "base64")), true);
    const raw = assembleRaw(signed.headers, signed.headerOrder, mime.body);
    assert.match(raw, /DKIM-Signature:/);
    if (prev) process.env.SOLPHIA_DKIM_PRIVATE_KEY = prev;
    else delete process.env.SOLPHIA_DKIM_PRIVATE_KEY;
  });

  it("delivers a DKIM-signed message over our SMTP to a local listener", async () => {
    const { privateKey } = testKey();
    const fake = await startFakeSmtp();
    const prev = {
      dkim: process.env.SOLPHIA_DKIM_PRIVATE_KEY,
      host: process.env.SOLPHIA_MAIL_HOST,
      port: process.env.SOLPHIA_MAIL_PORT,
    };
    process.env.SOLPHIA_DKIM_PRIVATE_KEY = privateKey;
    process.env.SOLPHIA_MAIL_HOST = "127.0.0.1";
    process.env.SOLPHIA_MAIL_PORT = String(fake.port);
    try {
      assert.equal(mailerKind(), "solphia");
      assert.equal(mailConfigured(), true);
      const rec = await queueEmail(emptyState(), "you@example.com", "Your Solphia code", "<p>123456</p>");
      assert.equal(rec.status, "sent", rec.error);
      assert.equal(fake.messages.length, 1);
      const wire = fake.messages[0] || "";
      assert.match(wire, /DKIM-Signature:/);
      assert.match(wire, /otp@solphia\.io/);
      assert.match(wire, /123456/);
      assert.match(wire, /From:/);
      await deliverSolphiaMail({
        from: "Solphia <otp@solphia.io>",
        to: "second@example.com",
        subject: "again",
        html: "<p>ok</p>",
      });
      assert.equal(fake.messages.length, 2);
    } finally {
      const put = (k: string, v: string | undefined) => {
        if (v) process.env[k] = v;
        else delete process.env[k];
      };
      put("SOLPHIA_DKIM_PRIVATE_KEY", prev.dkim);
      put("SOLPHIA_MAIL_HOST", prev.host);
      put("SOLPHIA_MAIL_PORT", prev.port);
      await fake.close();
    }
  });

  it("recovers the MX domain from RCPT TO when the worker omits mxDomain", () => {
    assert.equal(resolveMxDomain({ envelopeTo: ["you@gmail.com"] }), "gmail.com");
    assert.equal(resolveMxDomain({ mxDomain: "example.com", envelopeTo: ["you@gmail.com"] }), "example.com");
    assert.equal(resolveMxDomain({ envelopeTo: [] }), "");
  });

  it("refuses Gmail and SES as a smarthost and stuffs leading dots", () => {
    assert.equal(isThirdPartySmarthost("smtp.gmail.com"), true);
    assert.equal(isThirdPartySmarthost("email-smtp.us-east-1.amazonaws.com"), true);
    assert.equal(isThirdPartySmarthost("aspmx.l.google.com"), false);
    assert.equal(isThirdPartySmarthost("mail.solphia.io"), false);
    assert.equal(stuffDots("hello\n.hidden\n"), "hello\r\n..hidden\r\n");
  });

  it("posts signed mail to our worker over HTTPS instead of opening port 25", async () => {
    const got: { auth?: string; body?: string } = {};
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        got.auth = req.headers.authorization;
        got.body = Buffer.concat(chunks).toString("utf8");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, host: "worker", port: 443 }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    const prev = {
      url: process.env.SOLPHIA_MAIL_WORKER_URL,
      secret: process.env.SOLPHIA_MAIL_WORKER_SECRET,
    };
    process.env.SOLPHIA_MAIL_WORKER_URL = `http://127.0.0.1:${port}`;
    process.env.SOLPHIA_MAIL_WORKER_SECRET = "worker-secret-test";
    try {
      const out = await smtpSend({
        envelopeFrom: "otp@solphia.io",
        envelopeTo: ["you@example.com"],
        raw: "From: otp@solphia.io\r\nTo: you@example.com\r\nSubject: x\r\n\r\nhi\r\n",
      });
      assert.equal(out.host, "worker");
      assert.equal(got.auth, "Bearer worker-secret-test");
      assert.match(got.body || "", /otp@solphia\.io/);
    } finally {
      const put = (k: string, v: string | undefined) => {
        if (v) process.env[k] = v;
        else delete process.env[k];
      };
      put("SOLPHIA_MAIL_WORKER_URL", prev.url);
      put("SOLPHIA_MAIL_WORKER_SECRET", prev.secret);
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });

  it("does not send through a third-party host even if DKIM is ready", async () => {
    const { privateKey } = testKey();
    const prev = {
      dkim: process.env.SOLPHIA_DKIM_PRIVATE_KEY,
      host: process.env.SOLPHIA_MAIL_HOST,
      port: process.env.SOLPHIA_MAIL_PORT,
    };
    process.env.SOLPHIA_DKIM_PRIVATE_KEY = privateKey;
    process.env.SOLPHIA_MAIL_HOST = "smtp.gmail.com";
    delete process.env.SOLPHIA_MAIL_PORT;
    try {
      await assert.rejects(
        () =>
          smtpSend({
            envelopeFrom: "otp@solphia.io",
            envelopeTo: ["you@example.com"],
            raw: "From: otp@solphia.io\r\nTo: you@example.com\r\nSubject: x\r\n\r\nhi\r\n",
            host: "smtp.gmail.com",
          }),
        /third-party/,
      );
    } finally {
      const put = (k: string, v: string | undefined) => {
        if (v) process.env[k] = v;
        else delete process.env[k];
      };
      put("SOLPHIA_DKIM_PRIVATE_KEY", prev.dkim);
      put("SOLPHIA_MAIL_HOST", prev.host);
      put("SOLPHIA_MAIL_PORT", prev.port);
    }
  });
});
