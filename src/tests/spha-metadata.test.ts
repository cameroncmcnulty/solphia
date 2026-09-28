import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PublicKey } from "@solana/web3.js";
import { metadataPda, parseMetaplexData, TOKEN_METADATA_PROGRAM_ID, tokenMetadataJson } from "../lib/token/metadata";

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
    const files = (j.properties as { files: { uri: string; type: string }[] }).files;
    assert.equal(files[0].type, "image/jpeg");
    assert.equal(files[0].uri, "https://example.com/spha.jpg?ext=jpg");
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
});
