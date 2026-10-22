import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyLaunchBook, mergeLaunch } from "../lib/launch/engine";
import { setUsername, usernameIssue, usernameOk } from "../lib/launch/username";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";

describe("usernames", () => {
  it("accepts a handle and rejects junk, reserved, and taken names", () => {
    assert.equal(usernameOk("cam"), true);
    assert.equal(usernameOk("Cam_99"), true);
    assert.equal(usernameOk("ab"), false);
    assert.equal(usernameOk("1cam"), false);
    assert.equal(usernameOk("solphia"), false);
    assert.equal(usernameIssue("solphia"), "username_reserved");
    assert.equal(usernameIssue("ab"), "bad_username");
    assert.equal(usernameIssue(""), null);
    const book = emptyLaunchBook();
    const first = setUsername(book, A, "Cam");
    assert.equal(first.ok, true);
    if (first.ok) assert.equal(first.username, "Cam");
    const clash = setUsername(book, B, "cam");
    assert.equal(clash.ok, false);
    if (!clash.ok) assert.equal(clash.error, "username_taken");
    const same = setUsername(book, A, "Cam");
    assert.equal(same.ok, true);
  });

  it("keeps the newer handle across merges and lets a clear win", () => {
    const local = emptyLaunchBook();
    local.accounts[A] = { pubkey: A, referralRewardsSol: 0, username: "NewName", usernameAt: 20 };
    const remote = emptyLaunchBook();
    remote.accounts[A] = { pubkey: A, referralRewardsSol: 0, username: "OldName", usernameAt: 10 };
    assert.equal(mergeLaunch(local, remote).accounts[A].username, "NewName");
    const cleared = setUsername(emptyLaunchBook(), A, "");
    assert.equal(cleared.ok, true);
    if (cleared.ok) {
      assert.equal(cleared.username, "");
      assert.ok((cleared.account.usernameAt || 0) > 0);
    }
    const wipe = emptyLaunchBook();
    wipe.accounts[A] = { pubkey: A, referralRewardsSol: 0, usernameAt: 30 };
    const still = emptyLaunchBook();
    still.accounts[A] = { pubkey: A, referralRewardsSol: 0, username: "OldName", usernameAt: 10 };
    assert.equal(mergeLaunch(wipe, still).accounts[A].username, undefined);
  });
});
