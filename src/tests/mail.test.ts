import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeMail, createIdentity, emptyMail, mailAddress, signatureHtml, withSignature } from "../lib/email/desk";

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
});
