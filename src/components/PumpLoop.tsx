"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const STORE = "solphia_shill_vol";
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
    if (!document.querySelector("script[data-yt-api]")) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.dataset.ytApi = "1";
      tag.onerror = () => reject(new Error("youtube"));
      document.head.appendChild(tag);
    }
    window.setTimeout(() => {
      if (window.YT?.Player) resolve();
    }, 2500);
  });
}

export function PumpLoop() {
  const box = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [vol, setVol] = useState(0.5);
  const [muted, setMuted] = useState(true);
  const inRoom = true;

  useEffect(() => {
    const saved = Number(typeof window !== "undefined" ? localStorage.getItem(STORE) : 0.5);
    if (Number.isFinite(saved)) setVol(Math.min(1, Math.max(0, saved)));
  }, []);

  useEffect(() => {
    if (!inRoom) return;
    let dead = false;
    const start = Number(localStorage.getItem(STORE) || 0.5);
    loadApi()
      .then(() => {
        if (dead || !box.current || !window.YT?.Player) return;
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
              e.target.setVolume(Math.round((Number.isFinite(start) ? start : 0.5) * 100));
              e.target.mute();
              e.target.seekTo(HOOK_START, true);
              e.target.playVideo();
            },
            onStateChange: (e) => {
              if (e.data === 0) {
                e.target.seekTo(HOOK_START, true);
                e.target.playVideo();
              }
            },
          },
        });
      })
      .catch(() => {});
    const tick = window.setInterval(() => {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      try {
        if (p.getCurrentTime() >= HOOK_END) {
          p.seekTo(HOOK_START, true);
          p.playVideo();
        }
      } catch {
        /* ignore */
      }
    }, 800);
    return () => {
      dead = true;
      window.clearInterval(tick);
      try {
        player.current?.destroy();
      } catch {
        /* gone */
      }
      player.current = null;
    };
  }, [inRoom]);

  function apply(next: number, mute = muted) {
    const p = player.current;
    if (!p) return;
    p.setVolume(Math.round(next * 100));
    if (mute || next === 0) p.mute();
    else p.unMute();
    localStorage.setItem(STORE, String(next));
  }

  return (
    <>
      <div className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0" aria-hidden>
        <div ref={box} />
      </div>
      {inRoom && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              apply(vol, next);
            }}
            className="rounded-full p-2 text-mute hover:text-ghost"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted || vol === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
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
            }}
            className="w-16 accent-[#14f195]"
            aria-label="Volume"
          />
        </div>
      )}
    </>
  );
}
