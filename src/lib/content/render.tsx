import fs from "fs";
import path from "path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { candlePixels, PAIRS } from "./chart";
import type { Mood, Shot } from "./copy";

const VOID = "#04000a";
const GHOST = "#f7f4ff";
const MUTE = "#cfc7dd";
const ACID = "#14F195";
const VIOLET = "#c9a8ff";
const CYAN = "#80eaff";
const BLOOD = "#ff4d7a";
const LINE = "#2a1848";

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

function accent(mood: Mood) {
  if (mood === "cyan") return CYAN;
  if (mood === "violet") return VIOLET;
  return ACID;
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

function Mark({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ color, fontSize: 18, letterSpacing: 8, fontWeight: 700 }}>SOLPHIA</div>
      <div style={{ color: MUTE, fontSize: 16, marginTop: 6 }}>solphia.io</div>
    </div>
  );
}

function Pnl({ text, color }: { text: string; color: string }) {
  return <div style={{ color, fontSize: 22, fontWeight: 700 }}>{text}</div>;
}

function Footer({ shot }: { shot: Shot }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, color: MUTE, fontSize: 16 }}>
      <div style={{ display: "flex" }}>{shot.sub}</div>
      <div style={{ display: "flex" }}>solphia.io</div>
    </div>
  );
}

function Candles({ shot, height = 210, width = 720 }: { shot: Shot; height?: number; width?: number }) {
  const px = candlePixels(shot.candles, height);
  const w = Math.max(8, Math.floor(width / Math.max(1, px.length)) - 4);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        height,
        width,
        background: "#0b0614",
        borderRadius: 18,
        border: `1px solid ${LINE}`,
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 12,
        paddingBottom: 12,
      }}
    >
      {px.map((c, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            width: w,
            height: height - 8,
            marginRight: 3,
          }}
        >
          <div style={{ display: "flex", height: c.pad, width: 2 }} />
          <div style={{ display: "flex", width: 2, height: c.top, background: c.up ? ACID : BLOOD }} />
          <div
            style={{
              display: "flex",
              width: Math.max(8, w - 4),
              height: c.body,
              background: c.up ? ACID : BLOOD,
              borderRadius: 2,
            }}
          />
          <div style={{ display: "flex", width: 2, height: c.bot, background: c.up ? ACID : BLOOD }} />
        </div>
      ))}
    </div>
  );
}

function Curve({ shot, height = 160, width = 720 }: { shot: Shot; height?: number; width?: number }) {
  const w = Math.max(8, Math.floor(width / Math.max(1, shot.curve.length)) - 3);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        height,
        width,
        background: "#0b0614",
        borderRadius: 18,
        border: `1px solid ${LINE}`,
        paddingLeft: 14,
        paddingRight: 14,
        paddingTop: 14,
        paddingBottom: 14,
      }}
    >
      {shot.curve.map((b, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            width: w,
            height: Math.max(8, (b.h / 100) * (height - 28)),
            background: b.up ? ACID : VIOLET,
            marginRight: 4,
            borderRadius: 3,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}

function Sleeves({ shot }: { shot: Shot }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {shot.sleeves.map((s) => (
        <div key={s.name} style={{ display: "flex", flexDirection: "column", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: GHOST, fontSize: 18, marginBottom: 6 }}>
            <div style={{ display: "flex" }}>
              <div style={{ display: "flex" }}>{s.name}</div>
              <div style={{ display: "flex", color: MUTE, marginLeft: 10 }}>{s.tag}</div>
            </div>
            <div style={{ display: "flex", color: ACID }}>{s.pct}%</div>
          </div>
          <div style={{ display: "flex", height: 12, width: "100%", background: LINE, borderRadius: 99 }}>
            <div style={{ display: "flex", height: 12, width: `${Math.max(8, s.pct)}%`, background: ACID, borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Chips({ shot, color }: { shot: Shot; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", marginTop: 12 }}>
      {shot.chips.slice(0, 4).map((c) => (
        <div
          key={c}
          style={{
            display: "flex",
            color,
            border: `1px solid ${color}66`,
            borderRadius: 999,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 5,
            paddingBottom: 5,
            fontSize: 14,
            marginRight: 8,
            letterSpacing: 1,
          }}
        >
          {c}
        </div>
      ))}
    </div>
  );
}

function Shell({ shot, children }: { shot: Shot; children: ReactNode }) {
  const color = accent(shot.mood);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: VOID,
        color: GHOST,
        padding: shot.aspect === "9:16" ? 44 : 48,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Mark color={color} />
        <Pnl text={shot.pnlLabel} color={color} />
      </div>
      <div style={{ display: "flex", flex: 1, flexDirection: "column", marginTop: 22 }}>{children}</div>
      <Footer shot={shot} />
    </div>
  );
}

function Title({ shot, large }: { shot: Shot; large?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ color: VIOLET, fontSize: 16, letterSpacing: 4 }}>{shot.kicker}</div>
      <div style={{ fontSize: large ? 56 : 44, fontWeight: 700, lineHeight: 1.08, marginTop: 10 }}>{shot.headline}</div>
    </div>
  );
}

export async function renderShot(shot: Shot): Promise<Buffer> {
  const { width, height } = size(shot.aspect);
  const face = dataUrl("solphia-face.png");
  const hero = dataUrl("solphia-hero.png");
  const portrait = shot.layout === "desk" ? hero : face;
  const color = accent(shot.mood);
  const wide = shot.aspect === "16:9";
  const story = shot.aspect === "9:16";
  const faceW = story ? 624 : wide ? 420 : 640;
  const faceH = story ? 560 : wide ? 520 : 520;
  const chartW = wide ? 680 : story ? 620 : 960;
  const chartH = wide ? 280 : story ? 280 : 320;

  let inner: ReactNode;
  if (shot.layout === "tape") {
    inner = (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <Title shot={shot} large />
        <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
          <div style={{ display: "flex", color: MUTE, fontSize: 18, marginBottom: 10 }}>{shot.pair} · 15m</div>
          <Candles shot={shot} width={chartW} height={chartH} />
        </div>
        <Chips shot={shot} color={color} />
      </div>
    );
  } else if (shot.layout === "curve") {
    inner = (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <Title shot={shot} />
        <div style={{ display: "flex", flexDirection: "column", marginTop: 16 }}>
          <div style={{ display: "flex", color: MUTE, fontSize: 18, marginBottom: 10 }}>USDC mark · fees already in</div>
          <Curve shot={shot} width={chartW} height={chartH - 40} />
        </div>
        <Chips shot={shot} color={color} />
      </div>
    );
  } else if (shot.layout === "sleeves") {
    inner = (
      <div style={{ display: "flex", flexDirection: wide ? "row" : "column", flex: 1, marginTop: 8 }}>
        {!wide && <Title shot={shot} />}
        {wide && (
          <div style={{ display: "flex", flexDirection: "column", width: 420, paddingRight: 28 }}>
            <Title shot={shot} />
            <div style={{ display: "flex", marginTop: 20 }}>
              <Face src={portrait} w={380} h={380} />
            </div>
          </div>
        )}
        <div style={{ display: "flex", flex: 1, flexDirection: "column", marginTop: wide ? 0 : 22 }}>
          <Sleeves shot={shot} />
        </div>
      </div>
    );
  } else if (shot.layout === "split") {
    inner = (
      <div style={{ display: "flex", flexDirection: wide || !story ? "row" : "column", flex: 1 }}>
        <div style={{ display: "flex", marginRight: 24 }}>
          <Face src={portrait} w={wide ? 380 : 360} h={wide ? 500 : 420} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <Title shot={shot} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: MUTE, fontSize: 16, marginBottom: 8 }}>{shot.pair}</div>
            <Candles shot={shot} width={wide ? 740 : 560} height={220} />
          </div>
        </div>
      </div>
    );
  } else if (shot.layout === "steps") {
    inner = (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <Title shot={shot} />
        <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
          {shot.steps.map((s) => (
            <div
              key={s.n}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 22,
                border: `1px solid ${LINE}`,
                borderRadius: 20,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 52,
                  height: 52,
                  borderRadius: 999,
                  background: color,
                  color: VOID,
                  fontSize: 26,
                  fontWeight: 700,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 18,
                }}
              >
                {s.n}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>{s.t}</div>
                <div style={{ display: "flex", color: MUTE, fontSize: 18, marginTop: 4 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (shot.layout === "quote") {
    inner = (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
        <div style={{ display: "flex", color: color, fontSize: 18, letterSpacing: 6 }}>{shot.kicker}</div>
        <div style={{ display: "flex", fontSize: story ? 64 : 58, fontWeight: 700, lineHeight: 1.08, marginTop: 24 }}>
          {shot.headline}
        </div>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", color: MUTE, fontSize: 22, maxWidth: 520 }}>
            {shot.sub}
            <Chips shot={shot} color={color} />
          </div>
          <Face src={portrait} w={220} h={220} />
        </div>
      </div>
    );
  } else if (shot.layout === "session") {
    inner = (
      <div style={{ display: "flex", flexDirection: wide ? "row" : "column", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              color: VOID,
              background: CYAN,
              fontSize: 18,
              letterSpacing: 4,
              fontWeight: 700,
              borderRadius: 999,
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            {shot.session}
          </div>
          <Title shot={shot} large />
          <div style={{ display: "flex", color: MUTE, fontSize: 22, marginTop: 12 }}>
            Tokenized prints are not the NYSE after 16:00 ET. She treats cash, after hours, and weekend as different tapes.
          </div>
          <Chips shot={shot} color={CYAN} />
        </div>
        <div style={{ display: "flex", marginLeft: wide ? 28 : 0, marginTop: wide ? 0 : 20 }}>
          <Face src={portrait} w={wide ? 400 : faceW} h={wide ? 520 : 420} />
        </div>
      </div>
    );
  } else if (shot.layout === "kill") {
    inner = (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
        <Title shot={shot} large />
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            border: `3px solid ${BLOOD}`,
            color: BLOOD,
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: 8,
            borderRadius: 999,
            paddingLeft: 36,
            paddingRight: 36,
            paddingTop: 14,
            paddingBottom: 14,
            marginTop: 20,
          }}
        >
          KILL
        </div>
        <div style={{ display: "flex", color: MUTE, fontSize: 24, marginTop: 20 }}>
          Sells everything back to USDC (paper) or SOL (live) and pauses. Then you withdraw to Phantom.
        </div>
        <div style={{ display: "flex", marginTop: 16 }}>
          <Face src={portrait} w={story ? 520 : 360} h={story ? 420 : 300} />
        </div>
      </div>
    );
  } else if (shot.layout === "pairs") {
    inner = (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <Title shot={shot} />
        <div style={{ display: "flex", flexDirection: "row", marginTop: 24 }}>
          {[PAIRS.slice(0, 5), PAIRS.slice(5)].map((col, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", marginRight: 16, flex: 1 }}>
              {col.map((p) => (
                <div
                  key={p}
                  style={{
                    display: "flex",
                    color: GHOST,
                    border: `1px solid ${LINE}`,
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 10,
                    fontSize: 20,
                  }}
                >
                  {p}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  } else if (shot.layout === "story") {
    inner = (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", marginTop: 8, marginBottom: 18 }}>
          <Face src={portrait} w={faceW} h={faceH} />
        </div>
        <Title shot={shot} large />
        <div style={{ display: "flex", color: MUTE, fontSize: 22, marginTop: 14 }}>
          SOL, USDC, S&P 500, Nasdaq-100, gold. She clips the stretch. Spot only.
        </div>
        <Chips shot={shot} color={color} />
      </div>
    );
  } else if (shot.layout === "desk") {
    inner = (
      <div style={{ display: "flex", flexDirection: "row", flex: 1 }}>
        <div style={{ display: "flex" }}>
          <Face src={portrait} w={wide ? 500 : 420} h={wide ? 560 : 520} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: 32, justifyContent: "space-between" }}>
          <Title shot={shot} />
          <div style={{ display: "flex", color: MUTE, fontSize: 22 }}>Official SPYx · QQQx · GLDx. Keys in Phantom.</div>
          <Chips shot={shot} color={color} />
        </div>
      </div>
    );
  } else {
    inner = (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", marginTop: 10, marginBottom: 20, justifyContent: "center" }}>
          <Face src={portrait} w={faceW} h={faceH} />
        </div>
        <Title shot={shot} large />
        <div style={{ display: "flex", color: MUTE, fontSize: 22, marginTop: 12 }}>
          She trades SOL against official S&P, Nasdaq, and gold.
        </div>
        <Chips shot={shot} color={color} />
      </div>
    );
  }

  const res = new ImageResponse(<Shell shot={shot}>{inner}</Shell>, { width, height });
  return Buffer.from(await res.arrayBuffer());
}
