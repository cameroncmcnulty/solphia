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
  const drag = useRef<{ on: boolean; startX: number; orig: number }>({ on: false, startX: 0, orig: 10 });

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
    if (humanVerified()) return;
    setOpen(true);
    setPuzzle(makePuzzle());
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
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { on: true, startX: e.clientX, orig: xRef.current };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current.on) return;
    const track = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.startX) / Math.max(1, track.width - 48)) * (PUZZLE_W - PIECE_BOX);
    slideTo(clampSlide(drag.current.orig + dx));
  }
  function onPointerUp() {
    if (!drag.current.on) return;
    drag.current.on = false;
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
            <div className="relative mt-5 overflow-hidden rounded-2xl border border-violet/30 bg-void">
              <canvas ref={viewRef} width={PUZZLE_W} height={PUZZLE_H} className="human-canvas" />
            </div>
            <div
              className="human-track"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div className="human-track-fill" style={{ width: `${pct}%` }} />
              <button
                type="button"
                className="human-knob"
                style={{ left: `clamp(4px, calc(${pct}% - 22px), calc(100% - 48px))` }}
                aria-label="Slide to verify"
              >
                {">>"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
