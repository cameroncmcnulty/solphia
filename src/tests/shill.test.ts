import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { banShill, emptyShill, extractCas, fillHousePins, mergeShill, muteShill, pinSlotsLeft, pinToken, postShill, pruneShill, slimShill, touchMember, voteBoard, voteShill } from "../lib/shill/engine";
import {
  SHILL_CA_COOLDOWN_MS,
  SHILL_HOUSE_PIN_MAX,
  SHILL_HOUSE_PIN_MIN,
  SHILL_HOUSE_REPLACE_MS,
  SHILL_HOUSE_STAGGER_MS,
  SHILL_HOUSE_SPREAD_MS,
  SHILL_KEEP_MS,
  SHILL_MSG_MAX,
  SHILL_PIN_MS,
  SHILL_PIN_QUEUE_MAX,
  SHILL_PIN_SOL,
  SHILL_PIN_SLOTS,
  SHILL_VOTE_COOLDOWN_MS,
  SHILL_VOTE_MS,
} from "../lib/shill/types";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const CA = "So11111111111111111111111111111111111111112";

describe("shill zone", () => {
  it("blocks muted and banned wallets from posting", () => {
    const book = emptyShill();
    const now = 50_000;
    assert.equal(muteShill(book, A, 24 * 3600_000, now), true);
    const muted = postShill(book, { owner: A, text: "hi", now: now + 1000 });
    assert.equal(muted.ok, false);
    if (!muted.ok) assert.equal(muted.error, "muted");
    const later = postShill(book, { owner: A, text: "later", now: now + 24 * 3600_000 + 1 });
    assert.equal(later.ok, true);
    assert.equal(banShill(book, B, true, now), true);
    const banned = postShill(book, { owner: B, text: "nope", now: now + 10 });
    assert.equal(banned.ok, false);
    if (!banned.ok) assert.equal(banned.error, "banned");
  });

  it("pulls a CA out of chat and cools down the next one", () => {
    assert.deepEqual(extractCas(`ape ${CA} now`), [CA]);
    const book = emptyShill();
    const a = postShill(book, { owner: A, text: `buy ${CA}`, token: { mint: CA, symbol: "SOL", name: "Solana" }, now: 1 });
    assert.equal(a.ok, true);
    const b = postShill(book, { owner: A, text: `again ${CA}`, now: 1 + SHILL_CA_COOLDOWN_MS - 1 });
    assert.equal(b.ok, false);
    if (!b.ok) assert.equal(b.error, "ca_cooldown");
    const c = postShill(book, { owner: A, text: `later ${CA}`, now: 1 + SHILL_CA_COOLDOWN_MS + 1 });
    assert.equal(c.ok, true);
  });

  it("keeps a member touch when merging into a book that already has chat", () => {
    const live = emptyShill();
    const local = emptyShill();
    const now = Date.now();
    postShill(live, { owner: A, text: "keep me", now });
    touchMember(local, B, now);
    const merged = mergeShill(local, live);
    assert.equal(merged.messages.length, 1);
    assert.ok(merged.members[B]?.lastReadAt);
    assert.ok(merged.members[A]);
  });

  it("merges two books so an empty isolate cannot wipe chat", () => {
    const live = emptyShill();
    const stale = emptyShill();
    const now = Date.now();
    postShill(live, { owner: A, text: "keep me", now });
    const wiped = mergeShill(emptyShill(), live);
    assert.equal(wiped.messages.length, 1);
    assert.equal(wiped.messages[0].text, "keep me");
    postShill(stale, { owner: B, text: "older", now: now - 1000 });
    const both = mergeShill(live, stale);
    assert.equal(both.messages.length, 2);
  });

  it("pins five tokens for 3h then queues overflow until a slot frees", () => {
    const book = emptyShill();
    const t0 = 10_000;
    const gap = 60_000;
    for (let i = 0; i < SHILL_PIN_SLOTS; i++) {
      const r = pinToken(book, {
        owner: A,
        token: { mint: CA, symbol: "SOL", name: "Solana" },
        sig: `pinsig${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
        paidSol: SHILL_PIN_SOL,
        now: t0 + i * gap,
      });
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.queued, undefined);
    }
    assert.equal(pinSlotsLeft(book, t0 + gap * SHILL_PIN_SLOTS), 0);
    const overflow = pinToken(book, {
      owner: B,
      token: { mint: B, symbol: "BBB", name: "Beta" },
      sig: "pinsigfullxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: SHILL_PIN_SOL,
      now: t0 + gap * SHILL_PIN_SLOTS,
    });
    assert.equal(overflow.ok, true);
    if (!overflow.ok) throw new Error("expected queue");
    assert.equal(overflow.queued, true);
    assert.equal(overflow.position, 1);
    assert.ok((overflow.nextFreeAt || 0) >= t0 + SHILL_PIN_MS);
    assert.equal(book.pins.filter((p) => !p.house).length, SHILL_PIN_SLOTS);
    assert.equal((book.pinQueue || []).length, 1);
    assert.equal(book.pinQueue![0].mint, B);

    const second = pinToken(book, {
      owner: B,
      token: { mint: A, symbol: "AAA", name: "Alpha" },
      sig: "pinsigfull2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: SHILL_PIN_SOL,
      now: t0 + gap * SHILL_PIN_SLOTS + 1,
    });
    assert.equal(second.ok, true);
    if (second.ok) {
      assert.equal(second.queued, true);
      assert.equal(second.position, 2);
    }

    pruneShill(book, t0 + SHILL_PIN_MS + 1);
    assert.equal(book.pins.filter((p) => !p.house).length, SHILL_PIN_SLOTS);
    assert.ok(book.pins.some((p) => p.mint === B && p.endsAt === t0 + SHILL_PIN_MS + 1 + SHILL_PIN_MS));
    assert.equal((book.pinQueue || []).length, 1);
    assert.equal(book.pinQueue![0].mint, A);

    pruneShill(book, t0 + gap + SHILL_PIN_MS + 1);
    assert.ok(book.pins.some((p) => p.mint === A));
    assert.equal((book.pinQueue || []).length, 0);

    const replay = pinToken(book, {
      owner: B,
      token: { mint: B, symbol: "BBB", name: "Beta" },
      sig: "pinsigfullxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: SHILL_PIN_SOL,
      now: t0 + SHILL_PIN_MS + 50,
    });
    assert.equal(replay.ok, true);
    if (replay.ok) assert.equal(replay.replay, true);

    pruneShill(book, t0 + gap * SHILL_PIN_SLOTS + SHILL_PIN_MS + SHILL_PIN_MS + 1);
    assert.equal(book.pins.filter((p) => !p.house).length, 0);
    assert.equal((book.pinQueue || []).length, 0);
    assert.ok(SHILL_PIN_QUEUE_MAX >= 20);
  });

  it("keeps a pin queue across merge and slim", () => {
    const live = emptyShill();
    const t0 = Date.now();
    for (let i = 0; i < SHILL_PIN_SLOTS; i++) {
      pinToken(live, {
        owner: A,
        token: { mint: CA, symbol: "SOL", name: "Solana" },
        sig: `qmerge${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
        paidSol: SHILL_PIN_SOL,
        now: t0 + i,
      });
    }
    pinToken(live, {
      owner: B,
      token: { mint: B, symbol: "BBB", name: "Beta" },
      sig: "qmergefullxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: SHILL_PIN_SOL,
      now: t0 + 10,
    });
    const merged = mergeShill(emptyShill(), live);
    assert.equal((merged.pinQueue || []).length, 1);
    assert.equal(merged.pinQueue![0].mint, B);
    const slim = slimShill(merged);
    assert.equal((slim.pinQueue || []).length, 1);
    const replayQ = pinToken(merged, {
      owner: B,
      token: { mint: B, symbol: "BBB", name: "Beta" },
      sig: "qmergefullxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: SHILL_PIN_SOL,
      now: t0 + 11,
    });
    assert.equal(replayQ.ok, true);
    if (replayQ.ok) {
      assert.equal(replayQ.queued, true);
      assert.equal(replayQ.replay, true);
    }
  });

  it("keeps house pins until they expire, then restocks one after a short wait", () => {
    const book = emptyShill();
    const coins = [
      { mint: CA, symbol: "SOL", name: "Solana" },
      { mint: A, symbol: "AAA", name: "Alpha" },
      { mint: B, symbol: "BBB", name: "Beta" },
    ];
    assert.equal(fillHousePins(book, coins, 1_000), true);
    assert.equal(book.pins.length, SHILL_HOUSE_PIN_MIN);
    for (const p of book.pins) {
      assert.equal(p.endsAt - p.at, SHILL_PIN_MS);
    }
    const firstIds = book.pins.map((p) => p.id);
    assert.equal(fillHousePins(book, coins, 2_000), false, "must not reshuffle live house pins");
    assert.deepEqual(book.pins.map((p) => p.id), firstIds);

    const keeper = book.pins[0];
    book.pins[1].endsAt = 3_000;
    pruneShill(book, 3_001);
    assert.equal(book.pins.filter((p) => p.house).length, 1);
    assert.equal(fillHousePins(book, coins, 3_001), false, "wait a couple minutes after expiry");
    assert.equal(fillHousePins(book, coins, 3_001 + SHILL_HOUSE_REPLACE_MS), true);
    assert.equal(book.pins.filter((p) => p.house).length, 2);
    assert.ok(book.pins.some((p) => p.id === keeper.id));
    const restocked = book.pins.map((p) => p.id);
    assert.equal(fillHousePins(book, coins, 3_001 + SHILL_HOUSE_REPLACE_MS + 1), false);
    assert.equal(fillHousePins(book, coins, 3_001 + SHILL_HOUSE_REPLACE_MS + SHILL_HOUSE_STAGGER_MS), false);
    assert.deepEqual(book.pins.map((p) => p.id), restocked);

    const paid = pinToken(book, {
      owner: A,
      token: { mint: CA, symbol: "SOL", name: "Solana" },
      sig: "userpinxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: SHILL_PIN_SOL,
      now: 4_000,
    });
    assert.equal(paid.ok, true);
    assert.ok(book.pins.filter((p) => p.house).length <= SHILL_HOUSE_PIN_MAX);
  });

  it("clamps a house pin that somehow lasted past 3h and keeps pin order stable", () => {
    const book = emptyShill();
    const coins = [
      { mint: CA, symbol: "SOL", name: "Solana" },
      { mint: A, symbol: "AAA", name: "Alpha" },
      { mint: B, symbol: "BBB", name: "Beta" },
    ];
    const t0 = 10_000;
    fillHousePins(book, coins, t0);
    const order = book.pins.map((p) => p.id);
    book.pins[0].endsAt = t0 + 5 * 3600_000;
    pruneShill(book, t0 + 1_000);
    assert.ok(book.pins[0].endsAt - book.pins[0].at <= SHILL_PIN_MS);
    assert.deepEqual(book.pins.map((p) => p.id), order);
  });

  it("replants two staggered house pins when the rail is empty even after a prior plant", () => {
    const book = emptyShill();
    const coins = [
      { mint: CA, symbol: "SOL", name: "Solana" },
      { mint: A, symbol: "AAA", name: "Alpha" },
      { mint: B, symbol: "BBB", name: "Beta" },
    ];
    const t0 = 50_000;
    fillHousePins(book, coins, t0);
    book.pins = [];
    book.nextHousePinAt = t0 + SHILL_HOUSE_STAGGER_MS;
    assert.equal(fillHousePins(book, coins, t0 + 1_000), true);
    const house = book.pins.filter((p) => p.house).sort((a, b) => a.at - b.at);
    assert.equal(house.length, SHILL_HOUSE_PIN_MIN);
    assert.ok(house[1].at - house[0].at >= SHILL_HOUSE_SPREAD_MS - 1);
  });

  it("staggers initial house pins so they expire hours apart", () => {
    const book = emptyShill();
    const coins = [
      { mint: CA, symbol: "SOL", name: "Solana" },
      { mint: A, symbol: "AAA", name: "Alpha" },
      { mint: B, symbol: "BBB", name: "Beta" },
    ];
    const t0 = Date.now();
    fillHousePins(book, coins, t0);
    const house = book.pins.filter((p) => p.house).sort((a, b) => a.at - b.at);
    assert.ok(house.length >= 2);
    assert.ok(house[1].at - house[0].at >= SHILL_HOUSE_SPREAD_MS - 1);
    assert.ok(house[1].endsAt - house[0].endsAt >= SHILL_HOUSE_SPREAD_MS - 1);
  });

  it("counts 24h votes and enforces one upvote per hour", () => {
    const book = emptyShill();
    const t0 = 1_000_000;
    const a = voteShill(book, { owner: A, mint: CA, token: { mint: CA, symbol: "SOL", name: "Solana" }, now: t0 });
    assert.equal(a.ok, true);
    const again = voteShill(book, { owner: A, mint: CA, now: t0 + SHILL_VOTE_COOLDOWN_MS - 1 });
    assert.equal(again.ok, false);
    const later = voteShill(book, { owner: A, mint: CA, now: t0 + SHILL_VOTE_COOLDOWN_MS });
    assert.equal(later.ok, true);
    if (later.ok) assert.equal(later.votes, 2);
    voteShill(book, { owner: B, mint: A, token: { mint: A, symbol: "AAA", name: "Alpha" }, now: t0 });
    const board = voteBoard(book, t0);
    assert.equal(board[0].mint, CA);
    assert.equal(board[0].votes, 2);
    pruneShill(book, t0 + SHILL_VOTE_COOLDOWN_MS + SHILL_VOTE_MS + 1);
    assert.equal(voteBoard(book, t0 + SHILL_VOTE_COOLDOWN_MS + SHILL_VOTE_MS + 1).length, 0);
  });

  it("wipes oldest chat without touching live votes or their cooldown clock", () => {
    const book = emptyShill();
    const t0 = 2_000_000;
    postShill(book, { owner: A, text: "old line", now: t0 });
    const voted = voteShill(book, {
      owner: A,
      mint: CA,
      token: { mint: CA, symbol: "SOL", name: "Solana" },
      now: t0,
    });
    assert.equal(voted.ok, true);
    book.messages = book.messages.filter((m) => m.at < t0);
    pruneShill(book, t0 + SHILL_KEEP_MS + 1);
    assert.equal(book.messages.length, 0);
    const board = voteBoard(book, t0 + SHILL_KEEP_MS + 1);
    assert.equal(board.length, 1);
    assert.equal(board[0].mint, CA);
    assert.equal(board[0].votes, 1);
    assert.equal(board[0].symbol, "SOL");
    const cooled = voteShill(book, { owner: A, mint: CA, now: t0 + SHILL_VOTE_COOLDOWN_MS - 1 });
    assert.equal(cooled.ok, false);
    if (!cooled.ok) assert.equal(cooled.error, "cooldown");
  });

  it("does not print a mint prefix as the board ticker", () => {
    const book = emptyShill();
    const mint = "FQz8NDVSueEku6Bf8mSQitRSpk5uhM9cMkLLV9N5k2Ui";
    const voted = voteShill(book, {
      owner: A,
      mint,
      token: { mint, symbol: mint.slice(0, 4), name: mint.slice(0, 6) },
      now: 1_000,
    });
    assert.equal(voted.ok, true);
    const board = voteBoard(book, 1_000);
    assert.equal(board[0].mint, mint);
    assert.equal(board[0].symbol, "");
    assert.equal(board[0].votes, 1);
  });

  it("caps stored chat and keeps the newest lines", () => {
    const book = emptyShill();
    const t0 = Date.now() - SHILL_MSG_MAX * 1000;
    for (let i = 0; i < SHILL_MSG_MAX + 40; i++) {
      const r = postShill(book, { owner: A, text: `line ${i}`, now: t0 + i });
      assert.equal(r.ok, true);
    }
    assert.equal(book.messages.length, SHILL_MSG_MAX);
    assert.equal(book.messages[0].text, `line 40`);
    assert.equal(book.messages[book.messages.length - 1].text, `line ${SHILL_MSG_MAX + 39}`);
    const slim = slimShill(book);
    assert.equal(slim.messages.length, SHILL_MSG_MAX);
    assert.ok(slim.votes);
  });

  it("keeps banned wallets and house actors when idle members drop", () => {
    const book = emptyShill();
    const t0 = 10_000;
    book.houseActors = [{ i: 0, pubkey: B, named: true, nextShareAt: 0, nextVoteAt: 0, shareEveryMs: 1, voteEveryMs: 1, voteP: 0 }];
    touchMember(book, A, t0);
    touchMember(book, B, t0);
    banShill(book, A, true, t0);
    pruneShill(book, t0 + SHILL_KEEP_MS + 1);
    assert.ok(book.members[A]?.banned);
    assert.ok(book.members[B]);
  });

  it("docks chat above BottomNav without a second empty band", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const page = readFileSync(join(process.cwd(), "src/app/shill/page.tsx"), "utf8");
    const nav = readFileSync(join(process.cwd(), "src/components/BottomNav.tsx"), "utf8");
    const sheet = readFileSync(join(process.cwd(), "src/components/wallet/sheet.tsx"), "utf8");
    const profile = readFileSync(join(process.cwd(), "src/components/ProfileOverlay.tsx"), "utf8");
    assert.match(css, /--bottom-nav-h:\s*58px/);
    assert.match(css, /\.shill-dock \{[\s\S]*?padding-bottom:\s*calc\(var\(--bottom-nav-h\) \+ env\(safe-area-inset-bottom/);
    assert.match(css, /body\.shill-kbd \.shill-dock \{[\s\S]*?padding-bottom:\s*0/);
    assert.equal(css.includes("7.5rem"), false);
    assert.match(css, /\.app-layer,\s*\n\.shill-overlay-dock \{[\s\S]*?align-items:\s*flex-start/);
    assert.match(css, /\.app-layer,\s*\n\.shill-overlay-dock \{[\s\S]*?bottom:\s*calc\(var\(--bottom-nav-h\)/);
    assert.match(nav, /min-h-\[var\(--bottom-nav-h\)\]/);
    assert.match(page, /className="shill-dock /);
    assert.equal(/pb-3 md:pb-6/.test(page), false);
    assert.match(page, /app-layer shill-overlay-dock/);
    assert.match(sheet, /app-layer /);
    assert.match(profile, /app-layer /);
    assert.equal(page.includes("items-end justify-center"), false);
  });

  it("opens a gold pin spotlight and lets chat tokens open it too", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const page = readFileSync(join(process.cwd(), "src/app/shill/page.tsx"), "utf8");
    assert.match(css, /\.pin-spotlight \{/);
    assert.match(css, /\.pin-spotlight-buy \{/);
    assert.match(page, /PINNED ON THE RAIL/);
    assert.match(page, /Buy \{ticker\}/);
    assert.match(page, /function PinSpotlight/);
    assert.match(page, /onOpen=\{\(\) => openTokenCard\(m\.token!\)\}/);
    assert.match(page, /app-layer shill-overlay-dock/);
  });

  it("retries a pin on the same signature and confirms copy and votes", () => {
    const page = readFileSync(join(process.cwd(), "src/app/shill/page.tsx"), "utf8");
    assert.match(page, /lastPin/);
    assert.match(page, /not found yet\|Payment not found/);
    assert.match(page, /Confirming payment/);
    assert.match(page, /copyText\(mint, "CA copied"\)/);
    assert.match(page, /flashNotice/);
    assert.match(page, /nextVoteAt: nextAt/);
    const conn = readFileSync(join(process.cwd(), "src/lib/solana/connection.ts"), "utf8");
    assert.match(conn, /waitForSignature\(opts\.signature/);
    assert.match(conn, /innerInstructions/);
    const shell = readFileSync(join(process.cwd(), "src/components/Shell.tsx"), "utf8");
    assert.match(shell, /NoticeHost/);
  });

  it("toasts pin success, paints the rail immediately, and queues when the pad is full", () => {
    const page = readFileSync(join(process.cwd(), "src/app/shill/page.tsx"), "utf8");
    const api = readFileSync(join(process.cwd(), "src/app/api/shill/route.ts"), "utf8");
    assert.match(page, /applyPinBoard/);
    assert.match(page, /Live on the rail for 3 hours/);
    assert.match(page, /Queued\. Live when a slot opens/);
    assert.match(page, /setTab\("pins"\)/);
    assert.match(page, /pinQueue/);
    assert.match(page, /Queue · \$\{SHILL_PIN_SOL\} SOL/);
    assert.match(page, /const gen = full \? \+\+loadGen\.current : loadGen\.current/);
    assert.match(page, /Goes live when a rail slot frees/);
    assert.match(api, /pinQueue: snap\.pinQueue/);
    assert.match(api, /error: "queue_full"/);
    assert.equal(api.includes("No pin spots left"), false);
    assert.equal(api.includes("quiet ? {} : { pins:"), false);
    assert.match(api, /queued: Boolean\(result\.queued\)/);
    assert.match(api, /if \(!out\.result\.replay\)/);
  });

  it("resolves chat CAs from the pad book and never uses a mint prefix as a ticker", () => {
    const api = readFileSync(join(process.cwd(), "src/app/api/shill/route.ts"), "utf8");
    const page = readFileSync(join(process.cwd(), "src/app/shill/page.tsx"), "utf8");
    const feeds = readFileSync(join(process.cwd(), "src/lib/feeds/index.ts"), "utf8");
    const meta = readFileSync(join(process.cwd(), "src/lib/token/onchainMeta.ts"), "utf8");
    assert.match(api, /tokenFromPadBook/);
    assert.match(api, /paintedToken/);
    assert.match(api, /tokenHint/);
    assert.equal(api.includes("symbol: mint.slice(0, 4)"), false);
    assert.match(page, /displayTicker/);
    assert.match(feeds, /lite-api\.jup\.ag\/tokens\/v2\/search/);
    assert.match(meta, /getTokenMetadata/);
  });

  it("stamps the human cookie before the room opens and keeps upvote clickable", () => {
    const page = readFileSync(join(process.cwd(), "src/app/shill/page.tsx"), "utf8");
    const gate = readFileSync(join(process.cwd(), "src/components/HumanGate.tsx"), "utf8");
    const anti = readFileSync(join(process.cwd(), "src/lib/shill/antispam.ts"), "utf8");
    assert.match(page, /onPass=\{async/);
    assert.match(page, /action: "human"/);
    assert.match(page, /Slide to enter\|human/);
    assert.match(page, /voteBusy/);
    assert.match(gate, /await onPass/);
    assert.match(anti, /Binding IP breaks mobile/);
  });
});
