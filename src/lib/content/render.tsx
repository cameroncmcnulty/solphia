import fs from "fs";
import path from "path";
import { ImageResponse } from "next/og";
import type { Shot } from "./copy";

const VOID = "#04000a";
const GHOST = "#f7f4ff";
const MUTE = "#cfc7dd";
const ACID = "#14F195";
const VIOLET = "#c9a8ff";

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

function Face({ src, w, h }: { src: string; w: number; h: number }) {
  return (
    <img
      src={src}
      width={w}
      height={h}
      alt=""
      style={{ objectFit: "cover", borderRadius: 24, border: `1px solid ${VIOLET}55` }}
    />
  );
}

function Mark() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ color: ACID, fontSize: 18, letterSpacing: 8, fontWeight: 700 }}>SOLPHIA</div>
      <div style={{ color: MUTE, fontSize: 16, marginTop: 6 }}>solphia.io</div>
    </div>
  );
}

export async function renderShot(shot: Shot): Promise<Buffer> {
  const { width, height } = size(shot.aspect);
  const face = dataUrl("solphia-face.png");
  const hero = dataUrl("solphia-hero.png");
  const portrait = shot.layout === "desk" ? hero : face;
  const res = new ImageResponse(
    shot.aspect === "9:16" ? (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: VOID,
          color: GHOST,
          padding: 48,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Mark />
          <div style={{ color: ACID, fontSize: 22, fontWeight: 700 }}>{shot.pnlLabel}</div>
        </div>
        <div style={{ display: "flex", marginTop: 28, flex: 1 }}>
          <Face src={portrait} w={624} h={720} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
          <div style={{ color: VIOLET, fontSize: 18, letterSpacing: 4 }}>{shot.kicker}</div>
          <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.1, marginTop: 12 }}>{shot.headline}</div>
          <div style={{ color: MUTE, fontSize: 22, marginTop: 16, lineHeight: 1.35 }}>
            SOL, USDC, S&P 500, Nasdaq-100, gold. She clips the stretch. Spot only.
          </div>
        </div>
      </div>
    ) : shot.aspect === "16:9" ? (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          background: VOID,
          color: GHOST,
          padding: 48,
        }}
      >
        <div style={{ display: "flex", width: 520 }}>
          <Face src={portrait} w={500} h={624} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: 40, justifyContent: "space-between" }}>
          <Mark />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: VIOLET, fontSize: 18, letterSpacing: 4 }}>{shot.kicker}</div>
            <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.1, marginTop: 12 }}>{shot.headline}</div>
            <div style={{ color: MUTE, fontSize: 22, marginTop: 16 }}>Official SPYx · QQQx · GLDx. Keys in Phantom.</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ color: MUTE, fontSize: 20 }}>solphia.io</div>
            <div style={{ color: ACID, fontSize: 28, fontWeight: 700 }}>{shot.pnlLabel}</div>
          </div>
        </div>
      </div>
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: VOID,
          color: GHOST,
          padding: 56,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Mark />
          <div style={{ color: ACID, fontSize: 24, fontWeight: 700 }}>{shot.pnlLabel}</div>
        </div>
        <div style={{ display: "flex", marginTop: 32, justifyContent: "center" }}>
          <Face src={portrait} w={720} h={620} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 32 }}>
          <div style={{ color: VIOLET, fontSize: 18, letterSpacing: 5 }}>{shot.kicker}</div>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.08, marginTop: 10 }}>{shot.headline}</div>
          <div style={{ color: MUTE, fontSize: 24, marginTop: 14 }}>She trades SOL against official S&P, Nasdaq, and gold.</div>
        </div>
      </div>
    ),
    { width, height },
  );
  return Buffer.from(await res.arrayBuffer());
}
