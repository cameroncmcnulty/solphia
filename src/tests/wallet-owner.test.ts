import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OWNER_KEY,
  OWNER_MAX_AGE,
  ownerClearCookie,
  ownerSetCookie,
  parseOwnerCookie,
} from "../lib/wallet/owner";
import { DELETE, GET, POST } from "../app/api/wallet/remember/route";
import { SESSION_COOKIE, accountToken } from "../lib/auth/session";
import { NextRequest } from "next/server";

const PK = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";

describe("wallet owner cookie", () => {
  it("round-trips a pubkey and ignores junk", () => {
    const header = ownerSetCookie(PK, true);
    assert.ok(header.includes(`${OWNER_KEY}=${PK}`));
    assert.ok(header.includes("Path=/"));
    assert.ok(header.includes("SameSite=Lax"));
    assert.ok(header.includes("Secure"));
    assert.ok(header.includes(`Max-Age=${OWNER_MAX_AGE}`));
    assert.equal(parseOwnerCookie(header), PK);
    assert.equal(parseOwnerCookie(`${OWNER_KEY}=not-a-wallet; Path=/`), null);
    assert.equal(parseOwnerCookie(""), null);
    assert.equal(parseOwnerCookie(`other=1; ${OWNER_KEY}=${PK}`), PK);
  });

  it("clears with Max-Age 0", () => {
    const header = ownerClearCookie(false);
    assert.ok(header.includes("Max-Age=0"));
    assert.equal(header.includes("Secure"), false);
  });

  it("GET and POST only remember a wallet while an account session is live", async () => {
    const empty = new NextRequest("http://localhost/api/wallet/remember");
    const none = await GET(empty);
    assert.deepEqual(await none.json(), { pubkey: null });

    const leftover = new NextRequest("http://localhost/api/wallet/remember", {
      headers: { cookie: `${OWNER_KEY}=${PK}` },
    });
    const dropped = await GET(leftover);
    assert.deepEqual(await dropped.json(), { pubkey: null });
    const droppedSet = dropped.headers.get("set-cookie") || "";
    assert.ok(droppedSet.includes("Max-Age=0") || droppedSet.toLowerCase().includes("max-age=0"));

    const unsigned = await POST(
      new NextRequest("http://localhost/api/wallet/remember", {
        method: "POST",
        body: JSON.stringify({ pubkey: PK }),
        headers: { "content-type": "application/json" },
      }),
    );
    assert.equal(unsigned.status, 401);

    const session = `${SESSION_COOKIE}=${accountToken("acct_test")}`;
    const remembered = new NextRequest("http://localhost/api/wallet/remember", {
      headers: { cookie: `${session}; ${OWNER_KEY}=${PK}` },
    });
    const got = await GET(remembered);
    assert.deepEqual(await got.json(), { pubkey: PK });

    const post = await POST(
      new NextRequest("http://localhost/api/wallet/remember", {
        method: "POST",
        body: JSON.stringify({ pubkey: PK }),
        headers: { "content-type": "application/json", cookie: session },
      }),
    );
    assert.equal(post.status, 200);
    const set = post.headers.get("set-cookie") || "";
    assert.ok(set.includes(OWNER_KEY));
    assert.ok(set.toLowerCase().includes("samesite=lax"));
    assert.ok(set.includes(PK));

    const bad = await POST(
      new NextRequest("http://localhost/api/wallet/remember", {
        method: "POST",
        body: JSON.stringify({ pubkey: "nope" }),
        headers: { "content-type": "application/json", cookie: session },
      }),
    );
    assert.equal(bad.status, 400);

    const gone = await DELETE();
    assert.equal(gone.status, 200);
    const cleared = gone.headers.get("set-cookie") || "";
    assert.ok(cleared.includes("Max-Age=0") || cleared.toLowerCase().includes("max-age=0"));
  });
});
