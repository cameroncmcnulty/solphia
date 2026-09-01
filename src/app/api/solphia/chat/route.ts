import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { XAI_API_KEY, XAI_BASE, XAI_MODEL } from "@/lib/config";
import { clientIp, rateLimit, sanitizeText } from "@/lib/security";
import { loadState } from "@/lib/store";
import { RESEARCH } from "@/lib/config";

export const dynamic = "force-dynamic";

const Body = z.object({ message: z.string().min(1).max(500) });

const PERSONA = `You are Solphia. You help people make money on Solana memecoins by copying wallets that are already profitable and skipping rugs. Calm, clear, no slang-for-slang's-sake. Never ask for a seed. Not financial advice. ${RESEARCH.pumpfunLaunchDayDeathPct}% of Pump.fun coins die day one. Your fee is 0.35% vs ~1% elsewhere. Paper trading until live is on.`;

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":chat", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const message = sanitizeText(parsed.data.message, 500);
  const state = loadState();
  const context = `Equity $${state.paper.equityUsd.toFixed(2)} · open ${state.paper.positions.length} · realized ${state.paper.realizedPnlUsd.toFixed(2)} · last tick ${state.lastTickAt}`;

  if (!XAI_API_KEY) {
    const reply = localVoice(message, context);
    return NextResponse.json({ reply, model: "solphia-local" });
  }

  try {
    const res = await fetch(`${XAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${XAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        temperature: 0.4,
        messages: [
          { role: "system", content: PERSONA + "\n" + context },
          { role: "user", content: message },
        ],
      }),
    });
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content || localVoice(message, context);
    return NextResponse.json({ reply, model: XAI_MODEL });
  } catch {
    return NextResponse.json({ reply: localVoice(message, context), model: "solphia-local" });
  }
}

function localVoice(message: string, context: string): string {
  const m = message.toLowerCase();
  if (m.includes("key") || m.includes("seed") || m.includes("phrase")) {
    return "I will never take your keys. Connect Phantom or Solflare. You sign. I watch.";
  }
  if (m.includes("fee")) {
    return "Industry terminals take about 1%. I take 0.35% on fills, plus 0.15 SOL a month if you want the alert wire. The $1,000 book already subtracts those costs so the PnL is not a fairy tale.";
  }
  if (m.includes("score") || m.includes("risk")) {
    return "I skip a coin if they can freeze you, print extra tokens, yank liquidity, or if snipers already own it. Telegram links do not make it safe. Unique buyers and a clean creator do.";
  }
  return `Demo book: ${context}. Connect, deposit, turn me on. I copy wallets that are already profitable and skip the rest. Alerts are 0.15 SOL if you still want to tap buy yourself.`;
}
