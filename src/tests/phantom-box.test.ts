import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { b58dec, b58enc, decryptBox, encryptBox, isPhJob, newDappKey, slimAfter } from "../lib/wallet/phantomBox";
import { isPhantomUnauthorized, phantomAppUrl, phantomSignError, signerPage } from "../lib/wallet/phantomConnect";

describe("phantom box", () => {
  it("round-trips base58", () => {
    const bytes = Uint8Array.from([0, 1, 2, 255, 16, 0]);
    assert.deepEqual(Array.from(b58dec(b58enc(bytes))), Array.from(bytes));
  });

  it("encrypts and decrypts a Phantom payload", () => {
    const a = newDappKey();
    const b = newDappKey();
    const boxed = encryptBox(a.sk, b.pk, { transaction: "abc", session: "sess" });
    const opened = decryptBox(a.sk, b.pk, boxed.nonce, boxed.box);
    assert.equal(opened?.transaction, "abc");
    assert.equal(opened?.session, "sess");
    assert.equal(boxed.dappPk, a.pk);
  });

  it("turns the https UL into phantom:// so Chrome does not load the download page", () => {
    const https = "https://phantom.app/ul/v1/connect?app_url=https%3A%2F%2Fsolphia.io%2F";
    assert.equal(phantomAppUrl(https), "phantom://v1/connect?app_url=https%3A%2F%2Fsolphia.io%2F");
  });

  it("strips data-url art from a Phantom job so the session can persist", () => {
    const after = slimAfter({ kind: "launch_pool", image: "data:image/png;base64,aaaa", mint: "Mint111" });
    assert.equal(after?.image, undefined);
    assert.equal(after?.mint, "Mint111");
    assert.equal(isPhJob({ id: "abcdefghijk", dappSk: "1".repeat(32) }), true);
  });

  it("keeps claim-all remaining mints and drops an empty list", () => {
    const kept = slimAfter({ kind: "claim", claimAll: true, remainingMints: ["MintA", "MintB"], claimSol: 0.061849, remainingSol: 0.021962 });
    assert.deepEqual(kept?.remainingMints, ["MintA", "MintB"]);
    assert.equal(kept?.claimSol, 0.061849);
    assert.equal(kept?.remainingSol, 0.021962);
    const empty = slimAfter({ kind: "claim", remainingMints: [] });
    assert.equal(empty?.remainingMints, undefined);
  });

  it("treats Shill as a Phantom return page so connect persists there", () => {
    assert.equal(signerPage("/shill"), true);
    assert.equal(signerPage("/launch"), true);
    assert.equal(signerPage("/admin"), false);
  });

  it("maps Phantom 4001 unauthorized into a connect-again prompt", () => {
    const err = phantomSignError({ code: 4001, message: "The requested method and/or account has not been authorized by the user." });
    assert.match(err.message, /Approve Phantom/);
    assert.equal(isPhantomUnauthorized("The requested method and/or account has not been authorized by the user.", "4001"), true);
    assert.equal(isPhantomUnauthorized("Signature declined in Phantom.", "user_rejected"), false);
  });
});
