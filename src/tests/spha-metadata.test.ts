import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PublicKey } from "@solana/web3.js";
import { metadataPda, TOKEN_METADATA_PROGRAM_ID, tokenMetadataJson } from "../lib/token/metadata";

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
    assert.equal(j.image, "https://example.com/spha.jpg");
    assert.equal(j.external_url, "https://solphia.io");
  });
});
