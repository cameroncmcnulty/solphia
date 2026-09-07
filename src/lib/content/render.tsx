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

function pngSize(file: string) {
  const abs = path.join(process.cwd(), "public", file);
  const b = fs.readFileSync(abs);
  return { iw: b.readUInt32BE(16), ih: b.readUInt32BE(20) };
}

function size(aspect: Shot["aspect"]) {
  if (aspect === "16:9") return { width: 1280, height: 720 };
  if (aspect === "9:16") return { width: 720, height: 1280 };
  return { width: 864, height: 864 };
}

function neon(mood: Mood) {
  if (mood === "cyan") return CYAN;
  if (mood === "violet") return VIOLET;
  if (mood === "blood") return BLOOD;
  return ACID;
}

/** Cover-crop without stretching. Image keeps its pixel aspect. */
function coverBox(iw: number, ih: number, cw: number, ch: number, cropX: number, cropY: number) {
  const scale = Math.max(cw / iw, ch / ih);
  const w = Math.round(iw * scale);
  const h = Math.round(ih * scale);
  const maxX = Math.max(0, w - cw);
  const maxY = Math.max(0, h - ch);
  return {
    w,
    h,
    left: -Math.round((cropX / 100) * maxX),
    top: -Math.round((cropY / 100) * maxY),
  };
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
  const { iw, ih } = pngSize(shot.art.asset);
  const color = neon(shot.mood);
  const compose = shot.art.compose;
  const story = shot.aspect === "9:16";
  const wide = shot.aspect === "16:9";
  const side = shot.art.fit === "left" || shot.art.fit === "right";
  const head = Math.round((story ? 62 : wide ? 52 : 56) * shot.art.typeScale);
  const rng = mulberry(Math.round(shot.art.cropX * 97 + shot.art.cropY * 13 + shot.art.stars));
  const dots = Array.from({ length: Math.min(8, shot.art.stars) }, () => ({
    x: Math.round(rng() * (width - 16)),
    y: Math.round(rng() * height * 0.55),
    s: 2 + Math.round(rng() * 3),
    col: rng() > 0.5 ? color : VIOLET,
  }));

  const portraitW = side ? Math.round(height * (iw / ih)) : 0;
  const cover = side ? null : coverBox(iw, ih, width, height, shot.art.cropX, shot.art.cropY);
  const imgLeft = side ? (shot.art.fit === "right" ? width - portraitW : 0) : cover!.left;
  const imgTop = side ? 0 : cover!.top;
  const imgW = side ? portraitW : cover!.w;
  const imgH = side ? height : cover!.h;

  const typeW = side ? width - portraitW - 72 : Math.round(width * 0.86);
  const typeLeft = side ? (shot.art.fit === "left" ? portraitW + 48 : 40) : 40;
  const topHeavy = compose === "bleed-top" || compose === "type-hero";
  const typeTop = side || topHeavy ? 48 : Math.round(height * 0.66);
  const veilTop = topHeavy ? 0 : typeTop - 36;
  const veilH = topHeavy ? Math.round(height * 0.28) : height - veilTop;
  const align = side && shot.art.fit === "left" ? "flex-start" : compose === "type-hero" || compose === "orbit" ? "center" : shot.art.fit === "right" ? "flex-start" : "flex-start";

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
      <img
        src={src}
        width={imgW}
        height={imgH}
        alt=""
        style={{ position: "absolute", left: imgLeft, top: imgTop }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          display: "flex",
          background: side ? "rgba(4,0,10,0.12)" : "rgba(4,0,10,0.28)",
        }}
      />
      {!side ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: veilTop,
            width,
            height: veilH,
            display: "flex",
            background: compose === "kill-wash" ? "rgba(24,0,8,0.62)" : "rgba(4,0,10,0.55)",
          }}
        />
      ) : null}
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
            opacity: 0.65,
          }}
        />
      ))}
      {shot.art.tape ? (
        <div
          style={{
            position: "absolute",
            left: side ? typeLeft : 0,
            bottom: 28,
            display: "flex",
            width: side ? typeW : width,
            height: Math.round(height * (compose === "tape-sky" ? 0.16 : 0.09)),
            opacity: 0.9,
          }}
        >
          <Skyline
            shot={shot}
            width={side ? typeW : width}
            height={Math.round(height * (compose === "tape-sky" ? 0.16 : 0.09))}
            color={color}
          />
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: typeLeft,
          top: typeTop,
          width: typeW,
          display: "flex",
          flexDirection: "column",
          alignItems: align,
        }}
      >
        <div style={{ display: "flex", color, fontSize: 14, letterSpacing: 12, fontWeight: 700 }}>SOLPHIA</div>
        <div style={{ display: "flex", color: MUTE, fontSize: 13, letterSpacing: 5, marginTop: 10 }}>{shot.kicker}</div>
        {compose === "kill-wash" ? (
          <div
            style={{
              display: "flex",
              color: BLOOD,
              fontSize: Math.round(head * 1.2),
              fontWeight: 700,
              letterSpacing: 12,
              marginTop: 16,
              lineHeight: 0.95,
            }}
          >
            KILL
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            color: GHOST,
            fontSize: head,
            fontWeight: 700,
            lineHeight: 1.05,
            marginTop: 12,
            letterSpacing: -1,
          }}
        >
          {shot.headline}
        </div>
        <div style={{ display: "flex", color: MUTE, fontSize: 18, marginTop: 14, lineHeight: 1.4 }}>{shot.sub}</div>
        <div style={{ display: "flex", color, fontSize: 16, marginTop: 14, letterSpacing: 1 }}>{shot.pnlLabel}</div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 32,
          top: 28,
          display: "flex",
          color,
          fontSize: 13,
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
