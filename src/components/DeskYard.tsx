"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MODULES = [
  { id: "SIG", name: "SIGNAL GRAPH", code: "mesh.alpha", base: 0.62 },
  { id: "RSK", name: "RISK KERNEL", code: "kernel.sigma", base: 0.48 },
  { id: "XEC", name: "EXECUTION", code: "fill.router", base: 0.37 },
  { id: "CST", name: "CUSTODY RAIL", code: "sign.local", base: 0.81 },
  { id: "TEL", name: "TELEMETRY BUS", code: "obs.span", base: 0.71 },
  { id: "BKT", name: "BACKTEST REPLAY", code: "book.replay", base: 0.88 },
] as const;

const LOG_LINES = [
  { lv: "ok", msg: "hydrating execution mesh  / 12 shards" },
  { lv: "ok", msg: "non-custodial signer bound  device-local" },
  { lv: "wait", msg: "compiling risk kernel 0.9.4-rc" },
  { lv: "ok", msg: "backtest replay bus  ONLINE" },
  { lv: "wait", msg: "live clip gate  SEALED" },
  { lv: "ok", msg: "quote fabric  12µs p50  41µs p99" },
  { lv: "sys", msg: "pad launcher  OFFLINE  desk owns this rail" },
  { lv: "ok", msg: "custody rail  phrase never leaves device" },
  { lv: "wait", msg: "linking fill router → risk kernel" },
  { lv: "ok", msg: "telemetry spans  4096 ring buffer" },
  { lv: "sys", msg: "autonomous desk  IN CONSTRUCTION" },
  { lv: "wait", msg: "warming SIMD path  avx2/neon" },
  { lv: "ok", msg: "order fsm  NEW→ARM→FILL→FLAT" },
  { lv: "sys", msg: "public CA  withheld  token not live" },
];

function pad(n: number, w = 2) {
  return String(Math.max(0, Math.floor(n))).padStart(w, "0");
}

function clockOf(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;
}

function hexOf(n: number) {
  return (Math.floor(n) >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function DeskYard() {
  const [now, setNow] = useState(0);
  const [logAt, setLogAt] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), reduced.current ? 1000 : 50);
    const log = window.setInterval(() => setLogAt((n) => n + 1), reduced.current ? 2400 : 780);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(log);
    };
  }, []);

  const t = now || 0;
  const cycle = (t / 1000) % (Math.PI * 2);
  const compile = 0.42 + 0.08 * Math.sin(t / 1800);
  const logs = useMemo(() => {
    const n = 8;
    return Array.from({ length: n }, (_, i) => {
      const row = LOG_LINES[(logAt + i) % LOG_LINES.length];
      const stamp = t ? clockOf(t - (n - 1 - i) * 780) : "00:00:00.000";
      return { ...row, stamp, k: `${logAt}-${i}` };
    });
  }, [logAt, t]);

  return (
    <main className="desk-yard">
      <div className="desk-yard-grid" aria-hidden />
      <div className="desk-yard-scan" aria-hidden />
      <div className="desk-yard-hex" aria-hidden />
      <MeshCanvas now={t} />
      <div className="desk-yard-vignette" aria-hidden />

      <header className="desk-yard-bar">
        <div className="desk-yard-bar-l">
          <span className="desk-yard-led" />
          <span>SYS.DESK</span>
          <span className="desk-yard-sep">/</span>
          <span>SOLPHIA</span>
          <span className="desk-yard-sep">/</span>
          <span className="text-acid">AUTONOMOUS BOT</span>
        </div>
        <div className="desk-yard-bar-r">
          <span>BUILD {hexOf(t / 40)}</span>
          <span className="desk-yard-sep">/</span>
          <span className="tabular-nums">{t ? clockOf(t) : "—"} UTC</span>
        </div>
      </header>

      <section className="desk-yard-stage">
        <aside className="desk-yard-col">
          <p className="desk-yard-kicker">MODULE STACK</p>
          <ul className="desk-yard-mods">
            {MODULES.map((m, i) => {
              const pct = Math.min(0.97, Math.max(0.18, m.base + 0.07 * Math.sin(cycle + i * 0.7)));
              return (
                <li key={m.id} className="desk-yard-mod">
                  <div className="desk-yard-mod-h">
                    <span className="desk-yard-mod-id">{m.id}</span>
                    <span>{m.name}</span>
                    <span className="desk-yard-mod-pct">{Math.round(pct * 100)}%</span>
                  </div>
                  <div className="desk-yard-mod-code">{m.code}</div>
                  <div className="desk-yard-bar-track">
                    <i style={{ width: `${pct * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="desk-yard-core">
          <div className="desk-yard-rings" aria-hidden>
            <i className="desk-yard-ring desk-yard-ring-a" />
            <i className="desk-yard-ring desk-yard-ring-b" />
            <i className="desk-yard-ring desk-yard-ring-c" />
            <i className="desk-yard-gear desk-yard-gear-a" />
            <i className="desk-yard-gear desk-yard-gear-b" />
            <svg className="desk-yard-arc" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="78" />
              <circle
                className="desk-yard-arc-prog"
                cx="100"
                cy="100"
                r="78"
                style={{
                  strokeDasharray: `${2 * Math.PI * 78}`,
                  strokeDashoffset: `${2 * Math.PI * 78 * (1 - compile)}`,
                }}
              />
            </svg>
          </div>
          <div className="desk-yard-core-copy">
            <p className="desk-yard-kicker">RAIL STATUS</p>
            <h1>IN CONSTRUCTION</h1>
            <p className="desk-yard-tag">AUTONOMOUS TRADING BOT</p>
            <p className="desk-yard-blurb">
              Signal, risk, and execution are compiling on a non-custodial mesh. The token pad is offline. Live clips stay sealed until the book holds.
            </p>
            <div className="desk-yard-pills">
              <span>PAD OFFLINE</span>
              <span>KERNEL WARM</span>
              <span>NO PUBLIC CA</span>
            </div>
          </div>
        </div>

        <aside className="desk-yard-col desk-yard-log-col">
          <p className="desk-yard-kicker">KERNEL LOG</p>
          <ul className="desk-yard-log">
            {logs.map((row) => (
              <li key={row.k} className={`desk-yard-log-row lv-${row.lv}`}>
                <span className="desk-yard-log-t">{row.stamp}</span>
                <span className="desk-yard-log-lv">{row.lv}</span>
                <span>{row.msg}</span>
              </li>
            ))}
          </ul>
          <Scope now={t} />
        </aside>
      </section>

      <footer className="desk-yard-tape">
        <div className="desk-yard-tape-track">
          {Array.from({ length: 2 }, (_, k) => (
            <p key={k}>
              COMPILE · risk.kernel · fill.router · custody.rail · telemetry.bus · replay.book ·
              SIMD path · order FSM · quote fabric · live gate SEALED · pad OFFLINE · desk WARM ·
            </p>
          ))}
        </div>
      </footer>
    </main>
  );
}

function Scope({ now }: { now: number }) {
  const d = useMemo(() => {
    const pts = Array.from({ length: 48 }, (_, i) => {
      const x = (i / 47) * 100;
      const y = 50 + 18 * Math.sin(now / 240 + i * 0.33) + 8 * Math.sin(now / 110 + i * 0.9);
      return `${x},${y}`;
    });
    return pts.join(" ");
  }, [now]);
  return (
    <div className="desk-yard-scope">
      <p className="desk-yard-kicker">FILL LATENCY  µs</p>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <polyline points={d} />
      </svg>
    </div>
  );
}

function MeshCanvas({ now }: { now: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const nodes = useRef<{ x: number; y: number; vx: number; vy: number; g: boolean }[]>([]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = window.innerWidth < 640 ? 22 : 46;
    if (!nodes.current.length) {
      nodes.current = Array.from({ length: n }, () => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00022,
        vy: (Math.random() - 0.5) * 0.00022,
        g: Math.random() > 0.45,
      }));
    }
    const resize = () => {
      c.width = window.innerWidth * (window.devicePixelRatio || 1);
      c.height = window.innerHeight * (window.devicePixelRatio || 1);
    };
    resize();
    window.addEventListener("resize", resize);
    let raf = 0;
    const draw = (move: boolean) => {
      const w = c.width;
      const h = c.height;
      ctx.clearRect(0, 0, w, h);
      const pts = nodes.current;
      for (const p of pts) {
        if (move) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > 1) p.vx *= -1;
          if (p.y < 0 || p.y > 1) p.vy *= -1;
        }
      }
      const reach = Math.min(w, h) * 0.12;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = (pts[i].x - pts[j].x) * w;
          const dy = (pts[i].y - pts[j].y) * h;
          const d = Math.hypot(dx, dy);
          if (d > reach) continue;
          const a = 0.22 * (1 - d / reach);
          ctx.strokeStyle = pts[i].g ? `rgba(20,241,149,${a})` : `rgba(153,69,255,${a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[i].x * w, pts[i].y * h);
          ctx.lineTo(pts[j].x * w, pts[j].y * h);
          ctx.stroke();
        }
      }
      for (const p of pts) {
        ctx.fillStyle = p.g ? "rgba(20,241,149,0.9)" : "rgba(201,168,255,0.85)";
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.g ? 2.2 : 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    if (reduced) {
      draw(false);
      return () => window.removeEventListener("resize", resize);
    }
    const loop = () => {
      if (document.hidden) {
        raf = 0;
        return;
      }
      draw(true);
      raf = requestAnimationFrame(loop);
    };
    const vis = () => {
      if (!document.hidden && !raf) loop();
    };
    document.addEventListener("visibilitychange", vis);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [now > 0]);

  return <canvas ref={ref} className="desk-yard-mesh" aria-hidden />;
}
