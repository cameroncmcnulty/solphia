"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { pad2, splitRemaining } from "@/lib/token/countdown";
import { copyText } from "@/lib/copyText";
import "./meme-site.css";

export type MemePack = {
  name: string;
  symbol: string;
  handle: string;
  blurb: string;
  about: string;
  howToBuy: string;
  roadmap: { title: string; body: string }[];
  colors: { bg: string; ink: string; accent: string; muted: string; card: string; glow?: string; line?: string; glow2?: string };
  website: string;
  x: string;
  telegram: string;
  image: string;
  heroImage?: string;
  layout?: string;
  motion?: string;
  fonts?: { display: string; body: string; mono: string; href: string };
  tagline?: string;
  manifesto?: string;
  lore?: string;
  community?: string;
  warning?: string;
  features?: { title: string; body: string }[];
  faq?: { q: string; a: string }[];
  buySteps?: { n: string; title: string; body: string }[];
  stats?: { k: string; v: string }[];
  labels?: { story: string; split: string; buy: string; path: string; faq: string; lore: string; join: string; kicker: string };
  worldId?: string;
  supply: number;
  slices: { id: string; label: string; pct: string; bps: number; tokens: number; note: string }[];
  mint: string;
  phase: "soon" | "counting" | "live";
  countdown: { phase: string; launchAt: number; remainingMs: number; mintLeadMs: number; serverNow: number };
};

const LAYOUTS = ["cinema", "terminal", "studio", "neon", "glass", "brutal", "orbital", "pulse"] as const;
type Layout = (typeof LAYOUTS)[number];

const LABELS: Record<Layout, { story: string; split: string; buy: string; path: string; faq: string; lore: string; join: string; kicker: string }> = {
  cinema: { story: "The Picture", split: "The Split", buy: "Get In", path: "The Reels", faq: "Notes", lore: "Origin Story", join: "The House", kicker: "FEATURE PRESENTATION" },
  terminal: { story: "MANIFEST", split: "ALLOC", buy: "ACQUIRE", path: "TIMELINE", faq: "FAQ", lore: "LOG", join: "NET", kicker: "SYS · ONLINE" },
  studio: { story: "Editor's Note", split: "The Ledger", buy: "Acquisition", path: "Issue Map", faq: "Q&A", lore: "Backstory", join: "Salon", kicker: "LIMITED ISSUE" },
  neon: { story: "Signal", split: "Circuit", buy: "Jack In", path: "Waypoints", faq: "Ping", lore: "Origin", join: "Uplink", kicker: "NIGHT OPS · PUBLIC MINT" },
  glass: { story: "Atelier", split: "Composition", buy: "Collect", path: "Sequence", faq: "Studio Notes", lore: "Lore", join: "Circle", kicker: "ATELIER · PUBLIC MINT" },
  brutal: { story: "STATEMENT", split: "TOKENOMICS", buy: "HOW TO BUY", path: "ROADMAP", faq: "FAQ", lore: "LORE", join: "JOIN", kicker: "SIGNAL · PUBLIC MINT" },
  orbital: { story: "Core", split: "Mass", buy: "Dock", path: "Flight Plan", faq: "Briefing", lore: "Myth", join: "Crew", kicker: "ORBIT · PUBLIC BURN" },
  pulse: { story: "The Drop", split: "The Cut", buy: "How to buy", path: "The Run", faq: "Wait what", lore: "Why it hits", join: "Squad", kicker: "THE DROP · T-0" },
};

function hexRgb(hex: string): string {
  const raw = (hex || "").replace("#", "").trim();
  const h = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.slice(0, 6);
  const n = Number.parseInt(h || "000000", 16);
  if (!Number.isFinite(n)) return "0, 0, 0";
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function fmtSupply(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  return n.toLocaleString();
}

function asLayout(v?: string): Layout {
  return LAYOUTS.includes(v as Layout) ? (v as Layout) : "glass";
}

function artOf(pack: MemePack, kind: "art" | "hero") {
  if (kind === "hero") {
    const src = pack.heroImage || pack.image;
    if (src && (src.startsWith("http") || src.startsWith("data:image") || src.startsWith("/"))) return src;
    return `/api/m/${encodeURIComponent(pack.handle)}/art?kind=hero`;
  }
  if (pack.image && (pack.image.startsWith("http") || pack.image.startsWith("data:image") || pack.image.startsWith("/"))) {
    return pack.image;
  }
  return `/api/m/${encodeURIComponent(pack.handle)}/art`;
}

function MotionLayer({ motion, accent }: { motion: string; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (motion !== "particles") return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rgb = hexRgb(accent);
    let raf = 0;
    const n = window.innerWidth < 640 ? 26 : 54;
    const dots = Array.from({ length: n }, () => ({
      x: Math.random(),
      y: Math.random(),
      v: 0.00012 + Math.random() * 0.0003,
      r: 1.1 + Math.random() * 1.4,
    }));
    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const d of dots) {
        if (!reduce) {
          d.y -= d.v;
          if (d.y < 0) d.y = 1;
        }
        ctx.fillStyle = `rgba(${rgb}, 0.55)`;
        ctx.beginPath();
        ctx.arc(d.x * c.width, d.y * c.height, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = window.requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, [motion, accent]);

  if (motion === "particles") return <canvas ref={ref} className="mc-canvas" aria-hidden />;
  if (motion === "grid") return <div className="mc-grid-floor" aria-hidden />;
  if (motion === "aurora") return <div className="mc-aurora" aria-hidden />;
  if (motion === "scan") return <div className="mc-scanlines" aria-hidden />;
  if (motion === "wave") return <div className="mc-wave" aria-hidden />;
  if (motion === "orbit") {
    return (
      <div aria-hidden>
        <div className="mc-orbit-ring" style={{ inset: "8% 18%" }} />
        <div className="mc-orbit-ring" style={{ inset: "18% 28%" }} />
        <div className="mc-orbit-ring" style={{ inset: "28% 36%" }} />
      </div>
    );
  }
  return <div className="mc-aurora" aria-hidden />;
}

export function MemeCoinSite({ initial, ticker }: { initial: MemePack; ticker: string }) {
  const [pack, setPack] = useState(initial);
  const [copied, setCopied] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [spy, setSpy] = useState("top");
  const root = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLImageElement>(null);

  const load = useCallback(() => {
    fetch(`/api/m/${encodeURIComponent(ticker)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) return;
        setPack((prev) => ({
          ...prev,
          ...j,
          mint: j.phase === "live" ? j.mint || prev.mint : "",
          countdown: j.countdown || prev.countdown,
        }));
      })
      .catch(() => {});
  }, [ticker]);

  useEffect(() => {
    load();
    const id = window.setInterval(() => {
      if (document.hidden) return;
      load();
    }, pack.phase === "live" ? 8_000 : 1_200);
    return () => window.clearInterval(id);
  }, [load, pack.phase]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const href = pack.fonts?.href;
    if (!href) return;
    let link = document.getElementById("mc-fonts") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "mc-fonts";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [pack.fonts?.href]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      el.style.setProperty("--mx", `${e.clientX}px`);
      el.style.setProperty("--my", `${e.clientY}px`);
      const img = tilt.current;
      if (!img) return;
      const r = img.getBoundingClientRect();
      const x = (e.clientX - r.left) / Math.max(1, r.width) - 0.5;
      const y = (e.clientY - r.top) / Math.max(1, r.height) - 0.5;
      if (Math.abs(x) > 0.85 || Math.abs(y) > 0.85) {
        img.style.transform = "";
        return;
      }
      img.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const ids = ["top", "story", "split", "acquire", "path", "faq", "join"];
    const onScroll = () => {
      let current = "top";
      for (const id of ids) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top < 140) current = id;
      }
      setSpy(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const remaining = pack.phase === "live" ? 0 : pack.countdown.launchAt > 0 ? Math.max(0, pack.countdown.launchAt - now) : 0;
  const parts = splitRemaining(remaining);
  const c = pack.colors;
  const glow = c.glow || c.accent;
  const glow2 = c.glow2 || c.accent;
  const line = c.line || "#222";
  const tick = pack.symbol ? `$${pack.symbol}` : "";
  const layout = asLayout(pack.layout);
  const motion = pack.motion || "aurora";
  const worldId = pack.worldId || "generic";
  const labels = pack.labels || LABELS[layout];
  const fonts = pack.fonts || { display: "Syne", body: "DM Sans", mono: "IBM Plex Mono", href: "" };
  const hero = artOf(pack, "hero");
  const logo = artOf(pack, "art");
  const manifesto = pack.manifesto || pack.about;
  const lore = pack.lore || pack.blurb;
  const tagline = pack.tagline || pack.blurb;
  const warning = pack.warning || "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap.";
  const features = pack.features?.length ? pack.features : [
    { title: "On-chain float", body: `${tick} launches on a public Solana bonding curve. The supply on this page is the supply that mints.` },
    { title: "Public clock", body: "The countdown on this site is the launch clock. The contract address publishes here at T-0." },
    { title: "Community first", body: "Most of the supply sits on the curve for anyone with a Solana wallet." },
  ];
  const faq = pack.faq?.length ? pack.faq : [
    { q: `What is ${tick}?`, a: manifesto },
    { q: "When does the CA go live?", a: "CA publishes on this page at T-0." },
    { q: "How to buy?", a: pack.howToBuy },
  ];
  const buySteps = pack.buySteps?.length
    ? pack.buySteps
    : [
        { n: "01", title: "Get SOL", body: "Fund a Solana wallet from an exchange. Keep a little extra for fees." },
        { n: "02", title: "Wait for T-0", body: "CA publishes on this page at T-0." },
        { n: "03", title: "Swap on the curve", body: `Paste the CA, pay in SOL, receive ${tick}.` },
        { n: "04", title: "Hold or trade", body: pack.howToBuy },
      ];
  const stats = pack.stats?.length
    ? pack.stats
    : [
        { k: "Supply", v: fmtSupply(pack.supply) },
        { k: "Decimals", v: "6" },
        { k: "Network", v: "Solana" },
        { k: "Venue", v: "Meteora DBC" },
      ];

  const vars = useMemo(
    () =>
      ({
        "--mc-bg": c.bg,
        "--mc-ink": c.ink,
        "--mc-accent": c.accent,
        "--mc-muted": c.muted,
        "--mc-card": c.card,
        "--mc-glow": glow,
        "--mc-glow2": glow2,
        "--mc-line": line,
        "--mc-display": `"${fonts.display}"`,
        "--mc-body": `"${fonts.body}"`,
        "--mc-mono": `"${fonts.mono}"`,
        "--mc-accent-rgb": hexRgb(c.accent),
        "--mc-glow-rgb": hexRgb(glow),
        "--mc-glow2-rgb": hexRgb(glow2),
      }) as CSSProperties,
    [c.bg, c.ink, c.accent, c.muted, c.card, glow, glow2, line, fonts.display, fonts.body, fonts.mono],
  );

  function copy(label: string, value: string) {
    if (!copyText(value, `${label} copied`)) return;
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1600);
  }

  function magnet(e: React.PointerEvent<HTMLAnchorElement | HTMLButtonElement>) {
    const node = e.currentTarget;
    const r = node.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    node.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
  }
  function unmagnet(e: React.PointerEvent<HTMLAnchorElement | HTMLButtonElement>) {
    e.currentTarget.style.transform = "";
  }

  const nav = [
    ["story", labels.story],
    ["split", "Tokenomics"],
    ["acquire", "How to buy"],
    ["path", labels.path],
    ["faq", labels.faq],
  ] as const;

  return (
    <div ref={root} className={`mc mc-${layout} mc-world-${worldId} mc-motion-${motion}`} style={vars}>
      <div className="mc-motion">
        <MotionLayer motion={motion} accent={c.accent} />
      </div>
      <div className="mc-cursor" aria-hidden />
      {worldId === "vice" ? (
        <div className="mc-hud" aria-hidden>
          <div className="mc-hud-stars">
            <span /><span /><span /><span /><span />
          </div>
          <div className="mc-radar" />
          <div className="mc-hud-bars">
            <i className="mc-hp" />
            <i className="mc-ap" />
          </div>
          <div className="mc-coords mc-mono">25.7617°N 80.1918°W</div>
        </div>
      ) : null}
      <div className="mc-shell">
        <header className="mc-nav">
          <a href="#top" className="mc-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" />
            <div>
              <span>{tick}</span>
              <b>{pack.name}</b>
            </div>
          </a>
          <nav className="mc-nav-links" aria-label="Page">
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`} data-on={spy === id ? "1" : "0"}>
                {label}
              </a>
            ))}
            {pack.x ? (
              <a href={pack.x} target="_blank" rel="noreferrer">
                X
              </a>
            ) : null}
            {pack.telegram ? (
              <a href={pack.telegram} target="_blank" rel="noreferrer">
                TG
              </a>
            ) : null}
          </nav>
        </header>

        <section className="mc-hero" id="top">
          <div className="mc-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="" />
            <div className="mc-hero-shade" />
          </div>
          <div className="mc-hero-copy">
            <div className="mc-kicker">{labels.kicker || tick}</div>
            <h1 className="mc-title">{pack.name}</h1>
            <p className="mc-tag">{tagline}</p>
            <div className="mc-hero-actions">
              {pack.phase === "live" && pack.mint ? (
                <a
                  className="mc-cta"
                  href={`https://dexscreener.com/solana/${pack.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  onPointerMove={magnet}
                  onPointerLeave={unmagnet}
                >
                  Open the pair
                </a>
              ) : (
                <a className="mc-cta" href="#acquire" onPointerMove={magnet} onPointerLeave={unmagnet}>
                  How to buy
                </a>
              )}
              <a className="mc-ghost" href="#split">
                Tokenomics
              </a>
            </div>
            {pack.phase === "live" && pack.mint ? (
              <div className="mc-live">
                <div className="mc-kicker">LIVE · contract address</div>
                <button type="button" onClick={() => copy("CA", pack.mint)}>
                  {pack.mint}
                </button>
                {copied ? <div className="mc-copied mc-mono">{copied} copied</div> : null}
                <div className="mc-hero-actions" style={{ marginTop: "0.9rem" }}>
                  <a className="mc-ghost" href={`https://dexscreener.com/solana/${pack.mint}`} target="_blank" rel="noreferrer">
                    Dexscreener
                  </a>
                  <a className="mc-ghost" href="https://www.meteora.ag" target="_blank" rel="noreferrer">
                    Meteora
                  </a>
                </div>
              </div>
            ) : pack.countdown.launchAt > 0 ? (
              <div>
                <div className="mc-clock" aria-label="Launch countdown">
                  {[
                    ["DAYS", parts.d],
                    ["HRS", parts.h],
                    ["MIN", parts.m],
                    ["SEC", parts.s],
                  ].map(([k, v]) => (
                    <div className="mc-flip" key={k}>
                      <b>{pad2(Number(v))}</b>
                      <span>{k}</span>
                    </div>
                  ))}
                </div>
                <p className="mc-warn mc-mono">CA publishes on this page at T-0.</p>
              </div>
            ) : (
              <div className="mc-live">
                <div className="mc-kicker">Coming soon</div>
                <p>Launch time is not public yet. Stay on this page.</p>
              </div>
            )}
          </div>
        </section>

        <div className="mc-specs" aria-hidden>
          {stats.map((s) => (
            <span key={s.k} className="mc-mono">
              <em>{s.k}</em> {s.v}
            </span>
          ))}
        </div>
        <div className="mc-marquee" aria-hidden>
          <div className="mc-marquee-track">
            {[...stats, ...stats, ...stats].map((s, i) => (
              <span key={`${s.k}-${i}`}>
                {s.k} <b>{s.v}</b>
              </span>
            ))}
          </div>
        </div>

        <section className="mc-section" id="story">
          <div className="mc-wrap mc-grid-2">
            <div>
              <div className="mc-kicker">{labels.story}</div>
              <h2 className="mc-h2">{pack.name}</h2>
              <p className="mc-lead">{manifesto}</p>
              <div className="mc-grid-3" style={{ marginTop: "1.4rem" }}>
                {features.slice(0, 3).map((f) => (
                  <article className="mc-panel" key={f.title}>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="mc-tilt" style={{ display: "grid", placeItems: layout === "orbital" ? "center" : "end" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={tilt} className="mc-portrait" src={logo} alt="" />
            </div>
          </div>
        </section>

        <section className="mc-section" id="split">
          <div className="mc-wrap">
            <div className="mc-kicker">Tokenomics</div>
            <h2 className="mc-h2">{labels.split}</h2>
            <p className="mc-lead">
              Total supply {fmtSupply(pack.supply)} · 6 decimals. These percentages are the mint.
            </p>
            <div className="mc-grid-4" style={{ margin: "1.4rem 0 1.8rem" }}>
              {stats.slice(0, 4).map((s) => (
                <div className="mc-panel mc-stat" key={s.k}>
                  <b>{s.v}</b>
                  <span className="mc-mono">{s.k}</span>
                </div>
              ))}
            </div>
            <div className="mc-grid-2">
              {pack.slices.map((s) => (
                <article className="mc-panel" key={s.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline" }}>
                    <h3>{s.label}</h3>
                    <b className="mc-mono" style={{ color: "var(--mc-accent)" }}>
                      {s.pct}
                    </b>
                  </div>
                  <div className="mc-bar" aria-hidden>
                    <i style={{ ["--w" as string]: `${Math.max(2, Math.min(100, s.bps / 100))}%` }} />
                  </div>
                  <p className="mc-mono" style={{ fontSize: "0.78rem" }}>
                    {fmtSupply(s.tokens)} tokens
                  </p>
                  <p style={{ marginTop: "0.45rem" }}>{s.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-section" id="lore">
          <div className="mc-wrap">
            <div className="mc-kicker">{labels.lore}</div>
            <h2 className="mc-h2">Built for this niche</h2>
            <p className="mc-lead">{lore}</p>
          </div>
        </section>

        <section className="mc-section" id="acquire">
          <div className="mc-wrap">
            <div className="mc-kicker">How to buy</div>
            <h2 className="mc-h2">{labels.buy}</h2>
            <p className="mc-lead">{pack.howToBuy}</p>
            <div className="mc-grid-2" style={{ marginTop: "1.6rem" }}>
              {buySteps.map((s) => (
                <article className="mc-panel mc-step" key={s.n + s.title}>
                  <b>{s.n}</b>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-section" id="path">
          <div className="mc-wrap">
            <div className="mc-kicker">{labels.path}</div>
            <h2 className="mc-h2">Roadmap</h2>
            <div className="mc-path">
              {pack.roadmap.map((r) => (
                <article className="mc-panel mc-path-item" key={r.title}>
                  <div className="mc-kicker">{r.title}</div>
                  <p style={{ marginTop: "0.45rem" }}>{r.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-section" id="faq">
          <div className="mc-wrap">
            <div className="mc-kicker">{labels.faq}</div>
            <h2 className="mc-h2">Questions</h2>
            <div style={{ display: "grid", gap: "0.7rem", maxWidth: "46rem" }}>
              {faq.map((f) => (
                <details key={f.q} className="mc-panel mc-faq">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-section" id="join">
          <div className="mc-wrap">
            <div className="mc-kicker">{labels.join}</div>
            <h2 className="mc-h2">Show up at T-0</h2>
            <p className="mc-lead">{pack.community || `If you are here early, you are the culture. ${tick} needs people on the page when the clock dies.`}</p>
            <div className="mc-hero-actions">
              {pack.x ? (
                <a className="mc-cta" href={pack.x} target="_blank" rel="noreferrer" onPointerMove={magnet} onPointerLeave={unmagnet}>
                  Follow on X
                </a>
              ) : null}
              {pack.telegram ? (
                <a className="mc-ghost" href={pack.telegram} target="_blank" rel="noreferrer">
                  Telegram
                </a>
              ) : null}
              <a className="mc-ghost" href="#top">
                Back to the clock
              </a>
            </div>
            <p className="mc-warn">{warning}</p>
          </div>
        </section>

        <footer className="mc-foot">
          <span className="mc-mono">
            {tick} · {pack.name} · SOLANA · METEORA DBC
          </span>
          <span>{warning}</span>
        </footer>
      </div>
    </div>
  );
}
