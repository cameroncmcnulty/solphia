"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const STORE = "solphia_shill_vol";

/** Original four-on-the-floor pump loop. Not a copyrighted recording. */
export function PumpLoop() {
  const [vol, setVol] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [armed, setArmed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const api = useRef<Loop | null>(null);

  useEffect(() => {
    const saved = Number(typeof window !== "undefined" ? localStorage.getItem(STORE) : 0.5);
    const start = Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.5;
    setVol(start);
    const loop = createLoop();
    api.current = loop;
    loop.setGain(start);
    loop
      .start()
      .then((ok) => {
        setArmed(true);
        setBlocked(!ok);
      })
      .catch(() => setBlocked(true));
    return () => {
      loop.stop();
      api.current = null;
    };
  }, []);

  function apply(next: number, mute = muted) {
    const v = mute ? 0 : next;
    api.current?.setGain(v);
    localStorage.setItem(STORE, String(next));
  }

  async function unlock() {
    const ok = await api.current?.start();
    setBlocked(!ok);
    setArmed(true);
    apply(vol, muted);
  }

  return (
    <>
      {blocked && (
        <button
          type="button"
          onClick={unlock}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#0b0614]/92 text-center"
        >
          <div className="font-mono text-[11px] tracking-[0.28em] text-acid">SHILL ZONE</div>
          <div className="mt-3 font-display text-5xl text-ghost">Pump it.</div>
          <p className="mt-3 max-w-xs text-sm text-mute">Tap to drop in. The loop runs until you mute it.</p>
          <span className="btn-acid mt-6 rounded-full px-8 py-3 text-lg">Enter</span>
        </button>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (blocked) {
              unlock();
              return;
            }
            const next = !muted;
            setMuted(next);
            apply(vol, next);
          }}
          className="rounded-full border border-violet/30 p-2 text-ghost hover:border-acid/50 hover:text-acid"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted || vol === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : vol}
          onChange={(e) => {
            const n = Number(e.target.value);
            setVol(n);
            setMuted(n === 0);
            apply(n, n === 0);
            if (blocked) unlock();
          }}
          className="w-20 accent-[#14f195] sm:w-28"
          aria-label="Volume"
        />
        {armed && !blocked && !muted && vol > 0 && <span className="hidden font-mono text-[9px] tracking-[0.16em] text-acid sm:inline">LIVE</span>}
      </div>
    </>
  );
}

type Loop = { start: () => Promise<boolean>; stop: () => void; setGain: (v: number) => void };

function createLoop(): Loop {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let timer: number | null = null;
  let step = 0;
  const bpm = 128;
  const stepMs = ((60_000 / bpm) * 4) / 16;

  function boot() {
    if (ctx) return ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }

  function beep(type: OscillatorType, freq: number, dur: number, gain: number, at: number, slide?: number) {
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(master);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  function noise(dur: number, gain: number, at: number, hp = 800) {
    if (!ctx || !master) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(at);
    src.stop(at + dur + 0.02);
  }

  function tick() {
    if (!ctx || !master) return;
    const t = ctx.currentTime + 0.02;
    const s = step % 16;
    const bar = Math.floor(step / 16) % 8;
    beep("sine", 90, 0.12, 0.9, t, 42);
    if (s % 4 === 0) beep("triangle", 55, 0.18, 0.55, t, 38);
    if (s === 4 || s === 12) noise(0.12, 0.28, t, 1200);
    if (s % 2 === 1) noise(0.03, 0.12, t, 6000);
    if (s === 0 || s === 6 || s === 10) beep("sawtooth", bar % 2 ? 196 : 220, 0.09, 0.12, t);
    if (s === 14) beep("square", 330, 0.16, 0.1, t, 196);
    if (bar === 7 && s === 12) beep("sawtooth", 392, 0.28, 0.14, t, 196);
    step += 1;
  }

  return {
    async start() {
      const c = boot();
      try {
        await c.resume();
      } catch {
        return false;
      }
      if (c.state !== "running") return false;
      if (timer == null) {
        tick();
        timer = window.setInterval(tick, stepMs) as unknown as number;
      }
      return true;
    },
    stop() {
      if (timer != null) window.clearInterval(timer);
      timer = null;
      try {
        ctx?.close();
      } catch {
        /* already closed */
      }
      ctx = null;
      master = null;
    },
    setGain(v: number) {
      if (master && ctx) master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.7, ctx.currentTime, 0.05);
    },
  };
}
