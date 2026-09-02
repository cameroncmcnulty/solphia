import type { AlertEvent } from "../types";

export function alertEmailHtml(alert: AlertEvent, extra?: { score?: number; pnl?: string }): string {
  const score = extra?.score ?? alert.score ?? 0;
  const tone = score >= 78 ? "#b8ff3c" : score >= 60 ? "#5cffd8" : "#ff3d6e";
  return `<!doctype html>
<html>
<body style="margin:0;background:#050308;color:#c9c2d4;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050308;padding:32px 12px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#100a18;border:1px solid #2a1d3a;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:28px 32px 12px;letter-spacing:0.4em;font-size:11px;color:#14f195;font-family:ui-monospace,monospace;">SOLPHIA WOULD TAKE THIS</td></tr>
        <tr><td style="padding:0 32px 8px;font-size:28px;color:#f4f0ea;">${escapeHtml(alert.title)}</td></tr>
        <tr><td style="padding:0 32px 20px;font-size:15px;line-height:1.6;color:#7a708c;">${escapeHtml(alert.body)}</td></tr>
        <tr><td style="padding:0 32px 24px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:${tone};color:#050308;padding:8px 14px;border-radius:999px;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:0.12em;">SCORE ${score}</td>
            <td style="padding-left:10px;color:#7a708c;font-family:ui-monospace,monospace;font-size:12px;">${alert.strategy || "watch"} · ${new Date(alert.at).toISOString()}</td>
          </tr></table>
        </td></tr>
        ${alert.mint ? `<tr><td style="padding:0 32px 28px;font-family:ui-monospace,monospace;font-size:11px;color:#5cffd8;word-break:break-all;">${escapeHtml(alert.mint)}</td></tr>` : ""}
        <tr><td style="padding:16px 32px;border-top:1px solid #2a1d3a;font-size:11px;color:#7a708c;">
          Non-custodial. Paper mode until Helius live. Not financial advice. Memecoins can go to zero.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function welcomeEmailHtml(pubkey: string, untilIso: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;background:#050308;color:#c9c2d4;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#050308;">
    <tr><td align="center">
      <table width="560" style="background:#100a18;border:1px solid #2a1d3a;border-radius:18px;">
        <tr><td style="padding:32px;letter-spacing:0.45em;color:#5cffd8;font-size:11px;font-family:ui-monospace,monospace;">SOLPHIA IS ONLINE</td></tr>
        <tr><td style="padding:0 32px 12px;font-size:32px;color:#f4f0ea;">You are inside the terminal.</td></tr>
        <tr><td style="padding:0 32px 20px;line-height:1.7;color:#7a708c;">
          0.15 SOL / 30 days. Alerts, copy bot, P(grad) launch desk, and the live $1,000 paper track.
          Wallet <span style="color:#5cffd8;font-family:ui-monospace,monospace;">${escapeHtml(pubkey.slice(0, 4))}…${escapeHtml(pubkey.slice(-4))}</span>
          is covered until ${escapeHtml(untilIso)}.
        </td></tr>
        <tr><td style="padding:0 32px 32px;color:#7a708c;font-size:12px;">Solphia never holds your keys. She only reads the chain and writes paper fills until you go live.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
