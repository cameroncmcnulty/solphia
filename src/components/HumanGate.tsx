"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { TealConfetti } from "./TealConfetti";
import { drawCartoonScene, paintPuzzle } from "@/lib/human/cartoon";
import {
  PIECE_BOX,
  PUZZLE_H,
  PUZZLE_W,
  clampSlide,
  humanVerified,
  makePuzzle,
  markHuman,
  puzzleHit,
  type PuzzleChallenge,
} from "@/lib/human/puzzle";
import { clearScrollLock, lockPageScroll } from "@/lib/scrollLock";

export function HumanGate() {
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [fire, setFire] = useState(false);
  const [x, setX] = useState(10);
  const xRef = useRef(10);
  const [shake, setShake] = useState(false);
  const [puzzle, setPuzzle] = useState<PuzzleChallenge | null>(null);
  const viewRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ on: boolean; startX: number; orig: number; moved: boolean }>({
    on: false,
    startX: 0,
    orig: 10,
    moved: false,
  });

  function slideTo(n: number) {
    xRef.current = n;
    setX(n);
  }

  const buildScene = useCallback((next: PuzzleChallenge) => {
    const scene = document.createElement("canvas");
    scene.width = PUZZLE_W;
    scene.height = PUZZLE_H;
    const ctx = scene.getContext("2d");
    if (!ctx) return;
    drawCartoonScene(ctx, next.seed);
    sceneRef.current = scene;
  }, []);

  const composite = useCallback((slideX: number, next: PuzzleChallenge) => {
    const view = viewRef.current;
    const scene = sceneRef.current;
    if (!view || !scene) return;
    paintPuzzle(view, scene, { targetX: next.targetX, targetY: next.targetY, slideX });
  }, []);

  useEffect(() => {
    if (humanVerified()) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setPuzzle((p) => p || makePuzzle());
  }, []);

  useLayoutEffect(() => {
    if (!open || thanks || !puzzle) return;
    buildScene(puzzle);
    composite(xRef.current, puzzle);
  }, [open, thanks, puzzle, buildScene, composite]);

  useLayoutEffect(() => {
    if (!open || thanks || !puzzle) return;
    composite(x, puzzle);
  }, [x, open, thanks, puzzle, composite]);

  useEffect(() => {
    if (!open) return;
    lockPageScroll();
    const prevOver = document.documentElement.style.overscrollBehavior;
    document.documentElement.style.overscrollBehavior = "none";
    const block = (e: TouchEvent) => {
      if (drag.current.on) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => {
      clearScrollLock();
      document.documentElement.style.overscrollBehavior = prevOver;
      document.removeEventListener("touchmove", block);
    };
  }, [open]);

  function finish(ok: boolean) {
    if (!puzzle) return;
    if (!ok) {
      setShake(true);
      window.setTimeout(() => setShake(false), 420);
      const next = makePuzzle();
      slideTo(10);
      setPuzzle(next);
      return;
    }
    markHuman();
    setThanks(true);
    setFire(true);
    window.setTimeout(() => {
      setOpen(false);
      setFire(false);
    }, 2000);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { on: true, startX: e.clientX, orig: xRef.current, moved: false };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current.on) return;
    e.preventDefault();
    e.stopPropagation();
    const track = (trackRef.current || e.currentTarget).getBoundingClientRect();
    const dx = ((e.clientX - drag.current.startX) / Math.max(1, track.width - 56)) * (PUZZLE_W - PIECE_BOX);
    if (Math.abs(e.clientX - drag.current.startX) > 8) drag.current.moved = true;
    slideTo(clampSlide(drag.current.orig + dx));
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current.on) return;
    e.preventDefault();
    e.stopPropagation();
    const moved = drag.current.moved;
    drag.current.on = false;
    if (!moved) return;
    if (puzzle) finish(puzzleHit(xRef.current, puzzle.targetX));
  }

  if (!open) return fire ? <TealConfetti fire={fire} /> : null;

  const pct = (x / (PUZZLE_W - PIECE_BOX)) * 100;

  return (
    <div className="human-gate" role="dialog" aria-modal="true" aria-labelledby="human-title">
      <TealConfetti fire={fire} />
      <div className={`human-card ${shake ? "human-shake" : ""}`}>
        {thanks ? (
          <div className="px-2 py-10 text-center">
            <h2 id="human-title" className="font-display text-3xl text-ghost">
              Thanks for verifying you&apos;re a human
            </h2>
          </div>
        ) : (
          <>
            <h2 id="human-title" className="font-display text-2xl text-ghost sm:text-3xl">
              Verify you&apos;re human
            </h2>
            <p className="mt-1 text-sm text-mute">Slide the piece into the hole.</p>
            <div className="relative mt-5 overflow-hidden rounded-2xl border border-violet/30 bg-void">
              <canvas ref={viewRef} width={PUZZLE_W} height={PUZZLE_H} className="human-canvas" />
            </div>
            <div
              ref={trackRef}
              className="human-track"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div className="human-track-glow" />
              <div className="human-track-fill" style={{ width: `${pct}%` }} />
              <div className="human-track-hint">{pct < 8 ? "Slide →" : ""}</div>
              <button
                type="button"
                className="human-knob"
                style={{ left: `clamp(3px, calc(${pct}% - 26px), calc(100% - 54px))` }}
                aria-label="Slide to verify"
              >
                <span className="human-knob-chevs">››</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
