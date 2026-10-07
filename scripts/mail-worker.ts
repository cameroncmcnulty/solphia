import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { join } from "node:path";
import { smtpSend } from "../src/lib/email/smtp";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    if (!k || process.env[k]) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  }
}

loadEnvLocal();
delete process.env.SOLPHIA_MAIL_WORKER_URL;

const PORT = Number(process.env.SOLPHIA_MAIL_WORKER_PORT || 8787);
const HOST = process.env.SOLPHIA_MAIL_WORKER_BIND || "127.0.0.1";
const SECRET = (process.env.SOLPHIA_MAIL_WORKER_SECRET || "").trim();

if (!SECRET) {
  console.error("SOLPHIA_MAIL_WORKER_SECRET is required");
  process.exit(1);
}

function bearerOk(header: string): boolean {
  const want = Buffer.from(`Bearer ${SECRET}`);
  const got = Buffer.from((header || "").trim());
  if (want.length !== got.length) return false;
  return timingSafeEqual(want, got);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let n = 0;
    req.on("data", (c: Buffer) => {
      n += c.length;
      if (n > 250_000) {
        reject(new Error("too_large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const path = (req.url || "/").split("?")[0];
  if (req.method === "GET" && path === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, worker: "solphia-mail" }));
    return;
  }
  if (req.method !== "POST" || path !== "/send") {
    res.writeHead(404);
    res.end("not_found");
    return;
  }
  if (!bearerOk(req.headers.authorization || "")) {
    res.writeHead(401);
    res.end("denied");
    return;
  }
  try {
    const body = JSON.parse(await readBody(req)) as {
      envelopeFrom?: string;
      envelopeTo?: unknown;
      raw?: string;
    };
    const envelopeFrom = (body.envelopeFrom || "").trim().toLowerCase();
    const envelopeTo = Array.isArray(body.envelopeTo)
      ? body.envelopeTo.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
      : [];
    const raw = typeof body.raw === "string" ? body.raw : "";
    if (!envelopeFrom || !envelopeTo.length || !raw) {
      res.writeHead(400);
      res.end("bad_request");
      return;
    }
    const out = await smtpSend({ envelopeFrom, envelopeTo, raw, skipWorker: true });
    console.log(`sent ${envelopeTo.join(",")} ${out.host}:${out.port}`);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ...out }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    console.error("send_failed", message);
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`solphia-mail-worker ${HOST}:${PORT}`);
});
