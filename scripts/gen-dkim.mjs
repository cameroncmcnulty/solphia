import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const p = publicKey
  .replace(/-----BEGIN PUBLIC KEY-----/, "")
  .replace(/-----END PUBLIC KEY-----/, "")
  .replace(/\s+/g, "");

const pubSrc = `export const DKIM_SELECTOR = "solphia";
export const DKIM_DOMAIN = "solphia.io";
/** DNS TXT p= for solphia._domainkey.solphia.io */
export const DKIM_PUBLIC_P = "${p}";
`;

writeFileSync(join("src", "lib", "email", "dkim-public.ts"), pubSrc);

const envPath = join(".env.local");
let env = "";
try {
  env = readFileSync(envPath, "utf8");
} catch {
  env = "";
}
const oneLine = privateKey.replace(/\r/g, "").trim().replace(/\n/g, "\\n");
if (!/^SOLPHIA_DKIM_PRIVATE_KEY=/m.test(env)) {
  const nl = env.endsWith("\n") || !env ? "" : "\n";
  writeFileSync(envPath, `${env}${nl}SOLPHIA_DKIM_PRIVATE_KEY="${oneLine}"\n`);
  console.log("wrote_private_env true");
} else {
  console.log("wrote_private_env false");
}
console.log("pub_len", p.length);
