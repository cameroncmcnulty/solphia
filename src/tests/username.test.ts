import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyLaunchBook } from "../lib/launch/engine";
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
});
