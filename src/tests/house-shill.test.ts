import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { isSolanaAddress } from "../lib/security";
import { emptyLaunchBook } from "../lib/launch/engine";
import { emptyShill, liveRoomCount, mergeShill } from "../lib/shill/engine";
import { SHILL_PRESENCE_MS } from "../lib/shill/types";
import { composeHouseChat, phraseCardinality } from "../lib/shill/phrases";
import {
  HOUSE_ACTOR_N,
  HOUSE_CYCLE_MIN_LIFE_MS,
  HOUSE_LIVE_MAX,
  HOUSE_LIVE_MIN,
  HOUSE_NAME_MAX,
  HOUSE_NAME_MIN,
  HOUSE_RETIRE_RANK_MAX,
  HOUSE_RETIRE_RANK_MIN,
  HOUSE_SHARE_CLUSTER_MS,
  HOUSE_VOTE_CLUSTER_MS,
  actorShouldRetire,
  cryptoUsername,
  houseActorPubkey,
  mulberry32,
  namedHouseCount,
  paintHouseNames,
  plantHouseSchedules,
  recycleHouseActors,
  tickHouseActions,
} from "../lib/shill/house";
import { creditRank, leaderboard } from "../lib/rank/engine";

const CA = "So11111111111111111111111111111111111111112";
const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const C = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

const market = [
  { mint: A, symbol: "AAA", name: "Alpha" },
  { mint: B, symbol: "BBB", name: "Beta" },
  { mint: C, symbol: "CCC", name: "Gamma" },
];

function minGap(times: number[]) {
  const s = times.slice().sort((a, b) => a - b);
  let g = Infinity;
  for (let i = 1; i < s.length; i++) g = Math.min(g, s[i]! - s[i - 1]!);
  return g;
}

function isolate(book: ReturnType<typeof emptyShill>) {
  book.houseBootedAt = 1;
  book.housePresent = (book.houseActors || []).map((a) => a.pubkey);
  book.houseLive = book.housePresent.length;
  book.nextHouseLiveAt = 9e15;
  for (const a of book.houseActors || []) a.nextChatAt = 9e15;
}

describe("house shill wallets", () => {
  it("mints 87 unique real solana addresses", () => {
    const keys = Array.from({ length: HOUSE_ACTOR_N }, (_, i) => houseActorPubkey(i));
    assert.equal(keys.length, 87);
    assert.equal(new Set(keys).size, 87);
    for (const k of keys) assert.equal(isSolanaAddress(k), true);
    assert.equal(houseActorPubkey(0), houseActorPubkey(0));
    assert.notEqual(houseActorPubkey(0), houseActorPubkey(1));
  });

  it("plants 87 wallets with 60-70% crypto names and scrambled clocks", () => {
    const book = emptyShill();
    const launch = emptyLaunchBook();
    const rng = mulberry32(0x51ed);
    const t0 = 1_700_000_000_000;
    assert.equal(plantHouseSchedules(book, t0, rng), true);
    assert.equal(book.houseActors?.length, 87);
    assert.equal(plantHouseSchedules(book, t0 + 1000, rng), false, "must not reshuffle live wallets");
    const namedN = book.houseActors!.filter((a) => a.named).length;
    assert.ok(namedN / 87 >= HOUSE_NAME_MIN - 1e-9);
    assert.ok(namedN / 87 <= HOUSE_NAME_MAX + 1e-9);
    paintHouseNames(launch, book.houseActors!, rng);
    const painted = Object.values(launch.accounts).filter((a) => a.username).length;
    assert.equal(painted, namedN);
    for (const acc of Object.values(launch.accounts)) {
      if (!acc.username) continue;
      assert.match(acc.username, /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/);
    }
    const shares = book.houseActors!.map((a) => a.nextShareAt);
    const votes = book.houseActors!.map((a) => a.nextVoteAt);
    assert.ok(minGap(shares) >= HOUSE_SHARE_CLUSTER_MS - 1);
    assert.ok(minGap(votes) >= HOUSE_VOTE_CLUSTER_MS - 1);
    assert.ok(Math.max(...shares) - Math.min(...shares) > 2 * 3600_000, "share times must span hours");
    assert.ok(Math.max(...votes) - Math.min(...votes) > 2 * 3600_000, "vote times must span hours");
    assert.ok(shares.every((t) => t > t0));
    assert.ok(new Set(book.houseActors!.map((a) => a.shareEveryMs)).size > 10);
    assert.ok(new Set(book.houseActors!.map((a) => a.voteEveryMs)).size > 10);
  });

  it("two seeds scramble to different calendars", () => {
    const a = emptyShill();
    const b = emptyShill();
    const t0 = 2_000_000_000_000;
    plantHouseSchedules(a, t0, mulberry32(1));
    plantHouseSchedules(b, t0, mulberry32(99));
    const sa = a.houseActors!.map((x) => x.nextShareAt).join(",");
    const sb = b.houseActors!.map((x) => x.nextShareAt).join(",");
    assert.notEqual(sa, sb);
    const n1 = namedHouseCount(87, mulberry32(8));
    assert.ok(n1 >= Math.ceil(87 * HOUSE_NAME_MIN) && n1 <= Math.floor(87 * HOUSE_NAME_MAX));
  });

  it("shares a top-algorithm mint and never a pad mint", () => {
    const book = emptyShill();
    const rng = mulberry32(7);
    plantHouseSchedules(book, 10_000, rng);
    isolate(book);
    for (const a of book.houseActors!) a.nextShareAt = 50_000;
    book.lastHouseShareAt = 0;
    const pad = CA;
    const out = tickHouseActions(book, market.concat([{ mint: pad, symbol: "PAD", name: "Pad" }]), 50_000, rng, new Set([pad]));
    assert.equal(out.shares, 1);
    assert.equal(book.messages.length, 1);
    assert.ok(book.messages[0]!.text?.includes(book.messages[0]!.token?.mint || ""));
    assert.notEqual(book.messages[0]!.token?.mint, pad);
    assert.ok([A, B, C].includes(book.messages[0]!.token?.mint || ""));
    const owners = new Set(book.houseActors!.map((a) => a.pubkey));
    assert.ok(owners.has(book.messages[0]!.owner));
  });

  it("sometimes skips a due vote instead of burning every vote", () => {
    const skip = emptyShill();
    const fire = emptyShill();
    plantHouseSchedules(skip, 1_000, mulberry32(3));
    plantHouseSchedules(fire, 1_000, mulberry32(4));
    isolate(skip);
    isolate(fire);
    for (const a of skip.houseActors!) {
      a.nextVoteAt = 20_000;
      a.nextShareAt = 9e15;
      a.voteP = 0.01;
    }
    for (const a of fire.houseActors!) {
      a.nextVoteAt = 20_000;
      a.nextShareAt = 9e15;
      a.voteP = 0.99;
    }
    const skipped = tickHouseActions(skip, market, 20_000, () => 0.5);
    const fired = tickHouseActions(fire, market, 20_000, () => 0.01);
    assert.equal(skipped.votes, 0);
    assert.ok(skipped.shares === 0);
    assert.ok(fired.votes >= 1);
    assert.ok((fire.votes || []).length >= 1);
    assert.ok(skip.houseActors!.every((a) => a.nextVoteAt > 20_000));
  });

  it("keeps house wallets when an empty isolate merges in", () => {
    const live = emptyShill();
    plantHouseSchedules(live, 5_000, mulberry32(11));
    const merged = mergeShill(emptyShill(), live);
    assert.equal(merged.houseActors?.length, 87);
    const again = mergeShill(live, emptyShill());
    assert.equal(again.houseActors?.length, 87);
  });

  it("boots 51-87 wallets into the live room and they chat", () => {
    const book = emptyShill();
    const rng = mulberry32(42);
    const t0 = 3_000_000;
    plantHouseSchedules(book, t0, rng);
    const out = tickHouseActions(book, market, t0 + 1_000, rng);
    assert.ok((book.houseLive || 0) >= HOUSE_LIVE_MIN);
    assert.ok((book.houseLive || 0) <= HOUSE_LIVE_MAX);
    assert.equal((book.housePresent || []).length, book.houseLive);
    assert.ok(book.messages.length >= 10);
    assert.ok(book.messages.some((m) => !m.token), "plain chat, not only CA dumps");
    assert.ok(book.messages.some((m) => m.replyTo), "they answer each other");
    assert.equal(liveRoomCount(book, t0 + 1_000), book.houseLive);
    assert.ok(out.chats >= 0);
  });

  it("counts only wallets still in the room, not old ones that switched out", () => {
    const book = emptyShill();
    plantHouseSchedules(book, 1_000, mulberry32(5));
    tickHouseActions(book, market, 2_000, mulberry32(5));
    const house = book.houseLive || 0;
    const now = 10_000_000;
    book.members[A] = { pubkey: A, lastReadAt: now };
    book.members[B] = { pubkey: B, lastReadAt: now - SHILL_PRESENCE_MS - 1 };
    assert.equal(liveRoomCount(book, now), house + 1);
    book.members[A].lastReadAt = now - SHILL_PRESENCE_MS - 1;
    assert.equal(liveRoomCount(book, now), house);
  });

  it("gen 0 keeps the original seed; later gens are new wallets", () => {
    assert.equal(houseActorPubkey(0), houseActorPubkey(0, 0));
    assert.notEqual(houseActorPubkey(0, 1), houseActorPubkey(0));
    assert.equal(isSolanaAddress(houseActorPubkey(3, 4)), true);
    assert.notEqual(houseActorPubkey(3, 4), houseActorPubkey(3, 5));
  });

  it("plants cycle clocks so wallets retire on a random rank or in a few weeks", () => {
    const book = emptyShill();
    const t0 = 1_800_000_000_000;
    plantHouseSchedules(book, t0, mulberry32(17));
    for (const a of book.houseActors!) {
      assert.equal(a.gen, 0);
      assert.equal(a.bornAt, t0);
      assert.ok((a.retireRank || 0) >= HOUSE_RETIRE_RANK_MIN);
      assert.ok((a.retireRank || 0) <= HOUSE_RETIRE_RANK_MAX);
      assert.ok((a.retireAt || 0) > t0);
      assert.equal(actorShouldRetire(a, 100, t0 + 1000), false, "min life before a swap");
    }
    assert.equal(plantHouseSchedules(book, t0 + 1000, mulberry32(17)), false);
  });

  it("credits chat XP for a live house post and reports the owner", () => {
    const book = emptyShill();
    const launch = emptyLaunchBook();
    const rng = mulberry32(7);
    plantHouseSchedules(book, 10_000, rng);
    isolate(book);
    for (const a of book.houseActors!) a.nextShareAt = 50_000;
    book.lastHouseShareAt = 0;
    const out = tickHouseActions(book, market, 50_000, rng);
    assert.equal(out.shares, 1);
    assert.ok(out.xpOwners.length >= 1);
    const pk = out.xpOwners[0]!;
    const cred = creditRank(launch, pk, "chat", { now: 50_000 });
    assert.equal(cred.ok, true);
    if (cred.ok) assert.ok(cred.added > 0);
    assert.ok((launch.accounts[pk]?.xp || 0) > 0);
  });

  it("swaps a wallet that hit its random rank for a new pubkey", () => {
    const book = emptyShill();
    const rng = mulberry32(3);
    const born = 1_000;
    plantHouseSchedules(book, born, rng);
    const actor = book.houseActors![0]!;
    actor.retireRank = 8;
    actor.retireAt = 9e15;
    actor.bornAt = born;
    const old = actor.pubkey;
    book.housePresent = [old];
    const now = born + HOUSE_CYCLE_MIN_LIFE_MS;
    const retired = recycleHouseActors(book, { [old]: 8 }, now, rng);
    assert.equal(retired.length, 1);
    assert.equal(retired[0]!.oldPk, old);
    assert.notEqual(retired[0]!.newPk, old);
    assert.equal(isSolanaAddress(retired[0]!.newPk), true);
    assert.equal(book.houseActors!.find((x) => x.i === actor.i)?.pubkey, retired[0]!.newPk);
    assert.equal(book.houseActors!.some((x) => x.pubkey === old), false);
    assert.equal(book.housePresent!.includes(retired[0]!.newPk), true);
    assert.equal(book.houseActors!.length, HOUSE_ACTOR_N);
  });

  it("cycles on the few-week clock even at a low rank", () => {
    const book = emptyShill();
    const rng = mulberry32(9);
    const born = 2_000;
    plantHouseSchedules(book, born, rng);
    const actor = book.houseActors![4]!;
    const old = actor.pubkey;
    actor.retireRank = 90;
    actor.bornAt = born;
    actor.retireAt = born + HOUSE_CYCLE_MIN_LIFE_MS;
    const now = actor.retireAt;
    const retired = recycleHouseActors(book, { [old]: 2 }, now, rng);
    assert.equal(retired.length, 1);
    assert.equal(retired[0]!.oldPk, old);
    assert.notEqual(book.houseActors!.find((x) => x.i === actor.i)?.pubkey, old);
  });

  it("does not swap before the minimum life", () => {
    const book = emptyShill();
    const rng = mulberry32(2);
    const born = 3_000;
    plantHouseSchedules(book, born, rng);
    const actor = book.houseActors![1]!;
    actor.retireRank = 2;
    actor.retireAt = born;
    actor.bornAt = born;
    const retired = recycleHouseActors(book, { [actor.pubkey]: 40 }, born + 60_000, rng);
    assert.equal(retired.length, 0);
  });

  it("keeps 60-70 percent named after a swap", () => {
    const book = emptyShill();
    const rng = mulberry32(12);
    const born = 4_000;
    plantHouseSchedules(book, born, rng);
    for (const a of book.houseActors!) {
      a.bornAt = born;
      a.retireAt = born + HOUSE_CYCLE_MIN_LIFE_MS;
      a.retireRank = 8;
    }
    const now = born + HOUSE_CYCLE_MIN_LIFE_MS;
    const ranks: Record<string, number> = {};
    for (const a of book.houseActors!) ranks[a.pubkey] = 8;
    recycleHouseActors(book, ranks, now, rng, 1);
    const namedN = book.houseActors!.filter((a) => a.named).length;
    assert.ok(namedN / HOUSE_ACTOR_N >= HOUSE_NAME_MIN - 1e-9);
    assert.ok(namedN / HOUSE_ACTOR_N <= HOUSE_NAME_MAX + 1e-9);
  });

  it("wires house posts into rank XP and skips house keys on the live board", () => {
    const house = readFileSync(join(process.cwd(), "src/lib/shill/house.ts"), "utf8");
    const route = readFileSync(join(process.cwd(), "src/app/api/shill/route.ts"), "utf8");
    assert.match(house, /persistHouseXpAndCycles/);
    assert.match(house, /creditRank\(st\.launch, pk, "chat"/);
    assert.match(house, /recycleHouseActors/);
    assert.match(route, /persistHouseXpAndCycles/);
    assert.match(route, /housePubkeySet\(book\)/);
  });

  it("keeps house wallets off the public rank board", () => {
    const launch = emptyLaunchBook();
    const book = emptyShill();
    plantHouseSchedules(book, 1_000, mulberry32(1));
    const house = book.houseActors![0]!.pubkey;
    creditRank(launch, house, "chat", { now: 1_000 });
    creditRank(launch, A, "launch", { now: 1_000 });
    const skip = new Set(book.houseActors!.map((a) => a.pubkey));
    const board = leaderboard(launch, 10, skip);
    assert.equal(board.some((r) => r.pubkey === house), false);
    assert.equal(board.some((r) => r.pubkey === A), true);
  });

  it("crypto names pass the username rules", () => {
    const rng = mulberry32(21);
    const taken = new Set<string>();
    const names = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const u = cryptoUsername(rng, taken);
      assert.ok(u);
      taken.add(u!.toLowerCase());
      names.add(u!);
    }
    assert.equal(names.size, 40);
  });
});

describe("house chat phrases", () => {
  it("has at least 10000 distinct lines", () => {
    assert.ok(phraseCardinality() >= 10_000);
    const rng = mulberry32(99);
    const seen = new Set<string>();
    for (let i = 0; i < 2500; i++) seen.add(composeHouseChat(rng).text);
    assert.ok(seen.size > 400);
  });
});

describe("swap solana mark", () => {
  it("uses the official three-bar cyan-magenta logo", () => {
    const mark = readFileSync(join(process.cwd(), "src/components/SolanaMark.tsx"), "utf8");
    const swap = readFileSync(join(process.cwd(), "src/components/SwapWidget.tsx"), "utf8");
    assert.ok(mark.includes("#00FFA3"));
    assert.ok(mark.includes("#DC1FFF"));
    assert.equal((mark.match(/<path/g) || []).length, 3);
    assert.ok(swap.includes("SolanaMark"));
    assert.equal(swap.includes("function SolMark"), false);
    assert.equal(swap.includes('fill="#14F195"'), false);
  });
});
