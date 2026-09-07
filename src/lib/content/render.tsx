import React from "react";
import { ImageResponse } from "next/og";
import { candlePixels, mulberry } from "./chart";
import type { Mood, Shot } from "./copy";
import { blank, containBlit, coverBlit, encodePng, flatten, loadPng } from "./crop";
import { PNG } from "pngjs";

const VOID = "#04000a";
const GHOST = "#f7f4ff";
const MUTE = "#bdb3d1";
const ACID = "#14F195";
const VIOLET = "#c9a8ff";
const CYAN = "#80eaff";
const BLOOD = "#ff4d7a";

function size(aspect: Shot["aspect"]) {
  if (aspect === "16:9") return { width: 1280, height: 720 };
  if (aspect === "9:16") return { width: 864, height: 1536 };
  return { width: 864, height: 864 };
}

function neon(mood: Mood) {
  if (mood === "cyan") return CYAN;
  if (mood === "violet") return VIOLET;
  if (mood === "blood") return BLOOD;
  return ACID;
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

/** Photo layer is painted at native aspect with pngjs. Satori never sees the face. */
export function paintPhoto(shot: Shot, width: number, height: number): PNG {
  const src = loadPng(shot.art.asset);
  const canvas = blank(width, height);
  const side = shot.art.fit === "left" || shot.art.fit === "right";
  if (side) {
    const portraitW = Math.round(height * (src.width / src.height));
    const x = shot.art.fit === "right" ? width - portraitW : 0;
    coverBlit(src, canvas, { x, y: 0, w: portraitW, h: height }, shot.art.cropX, shot.art.cropY);
    return canvas;
  }
  if (shot.aspect === "9:16") {
    containBlit(src, canvas, { x: 0, y: 0, w: width, h: height }, 50, 0);
    return canvas;
  }
  coverBlit(src, canvas, { x: 0, y: 0, w: width, h: height }, shot.art.cropX, shot.art.cropY);
  return canvas;
}

export async function renderShot(shot: Shot): Promise<Buffer> {
  const { width, height } = size(shot.aspect);
  const color = neon(shot.mood);
  const compose = shot.art.compose;
  const story = shot.aspect === "9:16";
  const wide = shot.aspect === "16:9";
  const side = shot.art.fit === "left" || shot.art.fit === "right";
  const src = loadPng(shot.art.asset);
  const portraitW = side ? Math.round(height * (src.width / src.height)) : 0;
  const photoH = story ? Math.round(width * (src.height / src.width)) : height;
  const head = Math.round((story ? 54 : wide ? 50 : 52) * shot.art.typeScale);
  const rng = mulberry(Math.round(shot.art.cropX * 97 + shot.art.cropY * 13 + shot.art.stars));
  const dots = Array.from({ length: Math.min(8, shot.art.stars) }, () => ({
    x: Math.round(rng() * (width - 16)),
    y: Math.round(rng() * Math.min(height, story ? photoH : height) * 0.45),
    s: 2 + Math.round(rng() * 3),
    col: rng() > 0.5 ? color : VIOLET,
  }));

  const typeW = side ? width - portraitW - 72 : Math.round(width * 0.86);
  const typeLeft = side ? (shot.art.fit === "left" ? portraitW + 48 : 40) : 40;
  const typeTop = story ? Math.min(photoH + 28, height - 320) : side ? 48 : Math.round(height * 0.62);
  const veilTop = story ? photoH : typeTop - 28;
  const veilH = height - veilTop;
  const align = side && shot.art.fit === "left" ? "flex-start" : compose === "type-hero" || compose === "orbit" ? "center" : "flex-start";

  const overlay = new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        background: "transparent",
      }}
    >
      {side ? null : (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: veilTop,
            width,
            height: veilH,
            display: "flex",
            background: compose === "kill-wash" ? "rgba(24,0,8,0.78)" : "rgba(4,0,10,0.78)",
          }}
        />
      )}
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
            opacity: 0.55,
          }}
        />
      ))}
      {shot.art.tape ? (
        <div
          style={{
            position: "absolute",
            left: side ? typeLeft : 0,
            bottom: 24,
            display: "flex",
            width: side ? typeW : width,
            height: Math.round(height * (compose === "tape-sky" ? 0.14 : 0.08)),
            opacity: 0.9,
          }}
        >
          <Skyline
            shot={shot}
            width={side ? typeW : width}
            height={Math.round(height * (compose === "tape-sky" ? 0.14 : 0.08))}
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
              fontSize: Math.round(head * 1.15),
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

  const photo = paintPhoto(shot, width, height);
  const over = PNG.sync.read(Buffer.from(await overlay.arrayBuffer()));
  return encodePng(flatten(photo, over));
}
