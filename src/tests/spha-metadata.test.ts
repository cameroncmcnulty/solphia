import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PublicKey } from "@solana/web3.js";
import { metadataPda, parseMetaplexData, TOKEN_METADATA_PROGRAM_ID, tokenMetadataJson } from "../lib/token/metadata";
import { isTokenMetaUri, SPHA_FALLBACK_META_URI } from "../lib/token/sphaMeta";
import { SPHA_DEFAULT_IMAGE } from "../lib/token/omics";

describe("spha metadata", () => {
  it("derives a stable metaplex PDA", () => {
    const mint = new PublicKey("So11111111111111111111111111111111111111112");
    const pda = metadataPda(mint);
    assert.equal(pda.toBase58().length >= 32, true);
    assert.equal(metadataPda(mint).toBase58(), pda.toBase58());
    assert.equal(TOKEN_METADATA_PROGRAM_ID.toBase58(), "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  });

  it("builds token standard json with image and site", () => {
    const j = tokenMetadataJson({
      name: "Solphia",
      symbol: "SPHA",
      description: "desk",
      image: "https://example.com/spha.jpg",
      website: "https://solphia.io",
    });
    assert.equal(j.name, "Solphia");
    assert.equal(j.image, "https://example.com/spha.jpg?ext=jpg");
    assert.equal(j.external_url, "https://solphia.io");
    assert.equal(j.showName, true);
    assert.equal(j.createdOn, "https://solphia.io");
    assert.equal("attributes" in j, false);
    assert.equal("seller_fee_basis_points" in j, false);
    const social = tokenMetadataJson({
      name: "Pepe",
      symbol: "PEPE",
      description: "$PEPE community coin.",
      image: "https://example.com/pepe.png",
      website: "https://solphia.io/c/pepe",
      x: "https://x.com/pepe",
      telegram: "https://t.me/pepe",
    });
    assert.equal(social.twitter, "https://twitter.com/pepe");
    assert.equal(social.telegram, "https://t.me/pepe");
    assert.equal((social.extensions as { twitter?: string }).twitter, "https://twitter.com/pepe");
    const socialLinks = social.links as { type: string; url: string }[];
    assert.ok(socialLinks.some((l) => l.type === "twitter" && l.url.includes("twitter.com")));
    assert.ok(socialLinks.some((l) => l.type === "telegram"));
    assert.ok(socialLinks.some((l) => l.type === "website"));
    const files = (j.properties as { files: { uri: string; type: string; cdn?: boolean }[] }).files;
    assert.equal(files[0].type, "image/jpeg");
    assert.equal(files[0].uri, "https://example.com/spha.jpg?ext=jpg");
    assert.equal(files[0].cdn, undefined);
  });

  it("tags IPFS URLs with ?ext= so Phantom does not assume PNG", () => {
    const png = tokenMetadataJson({
      name: "Hi",
      symbol: "HI",
      description: "hi",
      image: "https://gateway.pinata.cloud/ipfs/QmHashNoExt",
      mime: "image/png",
    });
    assert.equal(png.image, "https://gateway.pinata.cloud/ipfs/QmHashNoExt?ext=png");
    const jpg = tokenMetadataJson({
      name: "Hi",
      symbol: "HI",
      description: "hi",
      image: "https://gateway.pinata.cloud/ipfs/QmHashNoExt",
      mime: "image/jpeg",
    });
    assert.equal(jpg.image, "https://gateway.pinata.cloud/ipfs/QmHashNoExt?ext=jpg");
    assert.equal((jpg.properties as { files: { type: string }[] }).files[0].type, "image/jpeg");
  });

  it("parses Metaplex name/symbol/uri from account bytes", () => {
    const str = (s: string) => {
      const b = Buffer.from(s, "utf8");
      const n = Buffer.alloc(4);
      n.writeUInt32LE(b.length, 0);
      return Buffer.concat([n, b]);
    };
    const raw = Buffer.concat([
      Buffer.from([0]),
      Buffer.alloc(32),
      Buffer.alloc(32),
      str("Princess"),
      str("PRINCESS"),
      str("https://ipfs.io/ipfs/QmMeta/json"),
    ]);
    const got = parseMetaplexData(raw);
    assert.equal(got?.name, "Princess");
    assert.equal(got?.symbol, "PRINCESS");
    assert.equal(got?.uri.startsWith("https://ipfs.io"), true);
  });

  it("rejects homepage URLs as token metadata", () => {
    assert.equal(isTokenMetaUri("https://solphia.io"), false);
    assert.equal(isTokenMetaUri("https://solphia.io/"), false);
    assert.equal(isTokenMetaUri("https://www.solphia.io"), false);
    assert.equal(isTokenMetaUri("https://solphia.io/launch"), false);
    assert.equal(isTokenMetaUri(SPHA_DEFAULT_IMAGE), false);
    assert.equal(isTokenMetaUri("https://ipfs.io/ipfs/QmMetaJson?ext=json"), true);
    assert.equal(isTokenMetaUri("https://gateway.pinata.cloud/ipfs/QmMetaJson"), true);
    assert.equal(isTokenMetaUri("https://example.com/spha.json"), true);
    assert.equal(isTokenMetaUri("not-a-url"), false);
    assert.equal(isTokenMetaUri(SPHA_FALLBACK_META_URI), true);
    const hosted = readFileSync(path.join(process.cwd(), "public/spha-meta.json"), "utf8");
    assert.match(hosted, /"symbol": "SPHA"/);
    assert.match(hosted, /spha-mark\.png/);
    assert.match(hosted, /solphiaio/);
    const pin = readFileSync(path.join(process.cwd(), "src/lib/token/sphaMeta.ts"), "utf8");
    assert.match(pin, /SPHA_FALLBACK_META_URI/);
    assert.match(pin, /if \(pinataConfigured\(\)\)/);
  });
});
