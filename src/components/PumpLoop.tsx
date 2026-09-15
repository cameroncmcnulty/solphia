"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const STORE = "solphia_shill_vol";
/** Ultra Records official video. We stream it — we do not host a copy. */
const VIDEO = "0HtyF0jux2Q";
const HOOK_START = 32;
const HOOK_END = 96;

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allowSeekAhead: boolean) => void;
  setVolume: (n: number) => void;
  mute: () => void;
  unMute: () => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number>;
          events?: { onReady?: (e: { target: YTPlayer }) => void; onStateChange?: (e: { data: number; target: YTPlayer }) => void };
        },
      ) => YTPlayer;
      PlayerState?: { ENDED: number; PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (document.querySelector("script[data-yt-api]")) return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.dataset.ytApi = "1";
    tag.onerror = () => reject(new Error("youtube"));
    document.head.appendChild(tag);
    window.setTimeout(() => {
      if (window.YT?.Player) resolve();
    }, 2500);
  });
}

export function PumpLoop() {
  const box = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [vol, setVol] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = Number(typeof window !== "undefined" ? localStorage.getItem(STORE) : 0.5);
    const start = Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.5;
    setVol(start);
    let dead = false;
    loadApi()
      .then(() => {
        if (dead || !box.current || !window.YT?.Player) {
          setBlocked(true);
          return;
        }
        player.current = new window.YT.Player(box.current, {
          videoId: VIDEO,
          width: 1,
          height: 1,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            start: HOOK_START,
          },
          events: {
            onReady: (e) => {
              if (dead) return;
              e.target.setVolume(Math.round(start * 100));
              if (start === 0) e.target.mute();
              e.target.seekTo(HOOK_START, true);
              e.target.playVideo();
              setReady(true);
              window.setTimeout(() => {
                if (dead) return;
                const st = e.target.getPlayerState?.();
                if (st !== 1) setBlocked(true);
              }, 800);
            },
            onStateChange: (e) => {
              if (dead) return;
              if (e.data === 1) setBlocked(false);
              if (e.data === 0 || (e.data === 1 && false)) {
                /* ended */
              }
              if (e.data === window.YT?.PlayerState?.ENDED || e.data === 0) {
                e.target.seekTo(HOOK_START, true);
                e.target.playVideo();
              }
            },
          },
        });
      })
      .catch(() => setBlocked(true));

    const tick = window.setInterval(() => {
      const p = player.current;
      if (!p?.getPlayerState) return;
      try {
        const iframe = box.current?.querySelector("iframe") as HTMLIFrameElement | undefined;
        const current = p.getCurrentTime?.() || 0;
        if (current >= HOOK_END) {
          p.seekTo(HOOK_START, true);
          p.playVideo();
        }
        void iframe;
      } catch {
        /* player not ready */
      }
    }, 800);

    return () => {
      dead = true;
      window.clearInterval(tick);
      try {
        player.current?.destroy();
      } catch {
        /* already gone */
      }
      player.current = null;
    };
  }, []);

  function apply(next: number, mute = muted) {
    const p = player.current;
    if (!p) return;
    p.setVolume(Math.round(next * 100));
    if (mute || next === 0) p.mute();
    else p.unMute();
    localStorage.setItem(STORE, String(next));
  }

  async function unlock() {
    const p = player.current;
    if (!p) {
      setBlocked(true);
      return;
    }
    p.unMute();
    p.setVolume(Math.round(vol * 100));
    p.seekTo(HOOK_START, true);
    p.playVideo();
    setMuted(false);
    setBlocked(false);
  }

  return (
    <>
      <div className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0" aria-hidden>
        <div ref={box} />
      </div>
      {blocked && (
        <button
          type="button"
          onClick={unlock}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#0b0614]/92 text-center"
        >
          <div className="font-mono text-[11px] tracking-[0.28em] text-acid">SHILL ZONE</div>
          <div className="mt-3 font-display text-5xl text-ghost">Pump it up</div>
          <p className="mt-3 max-w-xs text-sm text-mute">Danzel. Tap to drop the hook. Loop until you mute it.</p>
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
        {ready && !blocked && !muted && vol > 0 && (
          <span className="hidden font-mono text-[9px] tracking-[0.16em] text-acid sm:inline">DANZEL</span>
        )}
      </div>
    </>
  );
}
