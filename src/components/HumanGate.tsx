"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { TealConfetti } from "./TealConfetti";
import { cutPiece, drawCartoonScene, piecePath } from "@/lib/human/cartoon";
import {
  PIECE,
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
  const [x, setX] = useState(8);
  const xRef = useRef(8);
  const [shake, setShake] = useState(false);
  const [puzzle, setPuzzle] = useState<PuzzleChallenge | null>(null);
  const [pieceUrl, setPieceUrl] = useState("");
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ on: boolean; startX: number; orig: number }>({ on: false, startX: 0, orig: 8 });

  function slideTo(n: number) {
    xRef.current = n;
    setX(n);
  }

  const paint = useCallback((next: PuzzleChallenge) => {
    const view = sceneRef.current;
    if (!view) return;
    const scene = document.createElement("canvas");
    scene.width = PUZZLE_W;
    scene.height = PUZZLE_H;
    const ctx = scene.getContext("2d");
    const v = view.getContext("2d");
    if (!ctx || !v) return;
    drawCartoonScene(ctx, next.seed);
    const piece = cutPiece(scene, next.targetX, next.targetY);
    setPieceUrl(piece.toDataURL());
    v.clearRect(0, 0, PUZZLE_W, PUZZLE_H);
    v.drawImage(scene, 0, 0);
    v.save();
    piecePath(v, next.targetX, next.targetY);
    v.fillStyle = "rgba(4,0,10,0.55)";
    v.fill();
    v.strokeStyle = "rgba(20,241,149,0.75)";
    v.lineWidth = 2;
    v.stroke();
    v.restore();
  }, []);

  const roll = useCallback(() => {
    const next = makePuzzle();
    setPuzzle(next);
    slideTo(8);
  }, []);

  useEffect(() => {
    if (humanVerified()) return;
    setOpen(true);
    setPuzzle(makePuzzle());
  }, []);

  useLayoutEffect(() => {
    if (!open || thanks || !puzzle) return;
    paint(puzzle);
  }, [open, thanks, puzzle, paint]);

  function finish(ok: boolean) {
    if (!puzzle) return;
    if (!ok) {
      setShake(true);
      window.setTimeout(() => setShake(false), 420);
      roll();
      return;
    }
    markHuman();
    setThanks(true);
    setFire(true);
    window.setTimeout(() => {
      setOpen(false);
      setFire(false);
    }, 2200);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { on: true, startX: e.clientX, orig: xRef.current };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current.on) return;
    const track = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.startX) / Math.max(1, track.width - 48)) * (PUZZLE_W - PIECE);
    slideTo(clampSlide(drag.current.orig + dx));
  }
  function onPointerUp() {
    if (!drag.current.on) return;
    drag.current.on = false;
    if (puzzle) finish(puzzleHit(xRef.current, puzzle.targetX));
  }

  if (!open) return fire ? <TealConfetti fire={fire} /> : null;

  const pct = (x / (PUZZLE_W - PIECE)) * 100;

  return (
    <div className="human-gate" role="dialog" aria-modal="true" aria-labelledby="human-title">
      <TealConfetti fire={fire} />
      <div className={`human-card ${shake ? "human-shake" : ""}`}>
        {thanks ? (
          <div className="px-2 py-8 text-center">
            <p className="font-mono text-[11px] tracking-[0.28em] text-acid">VERIFIED</p>
            <h2 id="human-title" className="mt-2 font-display text-3xl text-ghost">
              Thanks for verifying you&apos;re a human
            </h2>
            <p className="mt-3 text-sm text-mute">Welcome in. Founders Circle is this way too.</p>
          </div>
        ) : (
          <>
            <p className="font-mono text-[11px] tracking-[0.28em] text-acid">NO BOTS</p>
            <h2 id="human-title" className="mt-1 font-display text-2xl text-ghost sm:text-3xl">
              Slide the piece into the puzzle
            </h2>
            <p className="mt-2 text-sm text-mute">A new cartoon every time. Fit the piece to use Solphia.</p>
            <div className="relative mt-5 overflow-hidden rounded-2xl border border-violet/30 bg-void">
              <canvas ref={sceneRef} width={PUZZLE_W} height={PUZZLE_H} className="human-canvas" />
              {puzzle && pieceUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" draggable={false} src={pieceUrl} className="human-piece" style={{ left: `${(x / PUZZLE_W) * 100}%`, top: `${(puzzle.targetY / PUZZLE_H) * 100}%` }} />
              )}
            </div>
            <div
              className="human-track"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div className="human-track-fill" style={{ width: `${pct}%` }} />
              <button type="button" className="human-knob" style={{ left: `clamp(4px, calc(${pct}% - 22px), calc(100% - 48px))` }} aria-label="Slide to fit the puzzle piece">
                {">>"}
              </button>
            </div>
            <p className="mt-3 font-mono text-[11px] text-mute">Drag the slider until the cartoon piece clicks in.</p>
          </>
        )}
      </div>
    </div>
  );
}
