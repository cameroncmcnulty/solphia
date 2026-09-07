import fs from "fs";
import path from "path";
import { ImageResponse } from "next/og";
import { candlePixels, mulberry } from "./chart";
import type { Mood, Shot } from "./copy";

const VOID = "#04000a";
const GHOST = "#f7f4ff";
const MUTE = "#bdb3d1";
const ACID = "#14F195";
const VIOLET = "#c9a8ff";
const CYAN = "#80eaff";
const BLOOD = "#ff4d7a";

function dataUrl(file: string) {
  const abs = path.join(process.cwd(), "public", file);
  const buf = fs.readFileSync(abs);
  const mime = file.endsWith(".jpg") || file.endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function size(aspect: Shot["aspect"]) {
  if (aspect === "16:9") return { width: 1280, height: 720 };
  if (aspect === "9:16") return { width: 720, height: 1280 };
  return { width: 1080, height: 1080 };
}

function neon(mood: Mood) {
  if (mood === "cyan") return CYAN;
  if (mood === "violet") return VIOLET;
  if (mood === "blood") return BLOOD;
  return ACID;
}

function veilColor(mood: Mood, fade: Shot["art"]["fade"]) {
  if (fade === "center") {
    if (mood === "blood") return "rgba(40,0,12,0.55)";
    if (mood === "cyan") return "rgba(4,16,28,0.5)";
    if (mood === "violet") return "rgba(18,0,36,0.52)";
    return "rgba(0,18,12,0.48)";
  }
  return "rgba(4,0,10,0.42)";
}

function Skyline({ shot, width, height, color }: { shot: Shot; width: number; height: number; color: string }) {
  const px = candlePixels(shot.candles, height);
  const col = Math.max(4, Math.floor(width / Math.max(1, px.length)));
  const bodyW = Math.max(2, col - 2);
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", width, height }}>
      {px.map((c, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            width: col,
            height,
          }}
        >
          <div style={{ display: "flex", height: c.pad, width: 1 }} />
          <div style={{ display: "flex", width: 1, height: c.top, background: c.up ? color : BLOOD }} />
          <div style={{ display: "flex", width: bodyW, height: c.body, background: c.up ? color : BLOOD }} />
          <div style={{ display: "flex", width: 1, height: c.bot, background: c.up ? color : BLOOD }} />
        </div>
      ))}
    </div>
  );
}

export async function renderShot(shot: Shot): Promise<Buffer> {
  const { width, height } = size(shot.aspect);
  const src = dataUrl(shot.art.asset);
  const color = neon(shot.mood);
  const compose = shot.art.compose;
  const story = shot.aspect === "9:16";
  const wide = shot.aspect === "16:9";
  const head = Math.round((story ? 70 : wide ? 58 : 64) * shot.art.typeScale);
  const rng = mulberry(Math.round(shot.art.cropX * 97 + shot.art.cropY * 13 + shot.art.stars));
  const dots = Array.from({ length: Math.min(10, shot.art.stars) }, () => ({
    x: Math.round(rng() * (width - 16)),
    y: Math.round(rng() * height * 0.62),
    s: 2 + Math.round(rng() * 4),
    col: rng() > 0.5 ? color : VIOLET,
  }));

  const side = compose === "bleed-side";
  const topHeavy = compose === "bleed-top" || compose === "type-hero";
  const typeWidth = side ? Math.round(width * 0.52) : Math.round(width * 0.84);

  const res = new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        background: VOID,
      }}
    >
      <img src={src} width={width} height={height} alt="" />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          display: "flex",
          background: veilColor(shot.mood, shot.art.fade),
        }}
      />
      {[0.22, 0.16, 0.12].map((h, i) => {
        const band = Math.round(height * h);
        const fromTop = compose === "bleed-top";
        const top = fromTop ? Math.round(height * [0, 0.22, 0.38][i]) : height - Math.round(height * [0.22, 0.38, 0.5][i]);
        const a = compose === "kill-wash" ? [0.82, 0.5, 0.22][i] : [0.82, 0.48, 0.2][i];
        const rgb = compose === "kill-wash" ? "40,0,10" : "4,0,10";
        return (
          <div
            key={`veil-${i}`}
            style={{
              position: "absolute",
              left: 0,
              top,
              width,
              height: band,
              display: "flex",
              background: `rgba(${rgb},${a})`,
            }}
          />
        );
      })}
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y,
            width: d.s,
            height: d.s,
            borderRadius: 40,
            background: d.col,
            display: "flex",
            opacity: 0.75,
          }}
        />
      ))}
      {shot.art.tape ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: topHeavy ? Math.round(height * 0.46) : 24,
            display: "flex",
            width,
            height: Math.round(height * (compose === "tape-sky" ? 0.2 : 0.11)),
            opacity: 0.88,
          }}
        >
          <Skyline shot={shot} width={width} height={Math.round(height * (compose === "tape-sky" ? 0.2 : 0.11))} color={color} />
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: shot.art.fade === "right" ? width - typeWidth - 48 : 48,
          top: topHeavy ? 48 : height - Math.round(height * 0.42),
          width: typeWidth,
          display: "flex",
          flexDirection: "column",
          alignItems: compose === "type-hero" || compose === "orbit" ? "center" : shot.art.fade === "right" ? "flex-end" : "flex-start",
        }}
      >
        <div style={{ display: "flex", color, fontSize: 15, letterSpacing: 11, fontWeight: 700 }}>SOLPHIA</div>
        <div style={{ display: "flex", color: MUTE, fontSize: 14, letterSpacing: 5, marginTop: 12 }}>{shot.kicker}</div>
        {compose === "kill-wash" ? (
          <div style={{ display: "flex", color: BLOOD, fontSize: Math.round(head * 1.35), fontWeight: 700, letterSpacing: 10, marginTop: 18, lineHeight: 0.95 }}>
            KILL
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            color: GHOST,
            fontSize: head,
            fontWeight: 700,
            lineHeight: 1.02,
            marginTop: 14,
            letterSpacing: -1,
          }}
        >
          {shot.headline}
        </div>
        <div style={{ display: "flex", color: MUTE, fontSize: 20, marginTop: 16, lineHeight: 1.4 }}>{shot.sub}</div>
        <div style={{ display: "flex", color, fontSize: 18, marginTop: 18, letterSpacing: 1 }}>{shot.pnlLabel}</div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 36,
          top: 32,
          display: "flex",
          color,
          fontSize: 14,
          letterSpacing: 5,
        }}
      >
        solphia.io
      </div>
    </div>,
    { width, height },
  );
  return Buffer.from(await res.arrayBuffer());
}
