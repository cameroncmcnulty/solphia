import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { XAI_API_KEY, XAI_BASE, XAI_MODEL } from "@/lib/config";
import { clientIp, rateLimit, sanitizeText } from "@/lib/security";
import { loadState } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({ message: z.string().min(1).max(500) });

const PERSONA = `You are Solphia. You trade SOL against three official Solana tokens: SPYx (S&P 500), QQQx (Nasdaq-100), and GLDx (gold). Phantom only. Practice first. Keys never sit in the model. No memecoins, no copy list, no sniper. When SOL looks expensive vs a market you sell SOL for that token; when it looks cheap you buy SOL back. You sit when nothing has moved. Spot only. Calm, plain language. Never ask for a seed. Not financial advice. Paper until live.`;

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
    return "I will never take your keys. Connect Phantom. You sign. I watch.";
  }
  if (m.includes("fee")) {
    return "I take 0.1% on each clip, plus 0.1 SOL a month for live spot or 0.15 SOL for optional SOL 2×/3×. The paper book already subtracts those costs so the PnL is not a fairy tale.";
  }
  if (m.includes("score") || m.includes("risk")) {
    return "I skip a coin if they can freeze you, print extra tokens, yank liquidity, or if snipers already own it. Telegram links are a P(grad) feature, not a buy signal. Unique buyers and a clean creator do more work than mention counts.";
  }
  if (m.includes("grad") || m.includes("launch")) {
    return "Launch is not a sniper. I estimate P(grad) from curve fill, SOL per unique buyer, bot-share, creator history, and whether a social link is actually there. Under the bar, she stays off.";
  }
  return `Demo book: ${context}. Connect Phantom, add SOL, watch me trade S&P 500, Nasdaq, and gold. Practice first. Hit KILL to stop.`;
}
