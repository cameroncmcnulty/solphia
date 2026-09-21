"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type TouchEvent, type WheelEvent } from "react";
import { createPortal } from "react-dom";
import { IMAGE_DATA_MAX } from "@/lib/launch/validate";
import {
  TOKEN_ART_MAX_ZOOM,
  TOKEN_ART_MIN_PX,
  TOKEN_ART_PX,
  TOKEN_ART_STORE_PX,
  coverCrop,
  cropStageStyle,
  panCrop,
  zoomCrop,
  zoomOf,
  type CropRect,
} from "@/lib/launch/tokenImage";

export type CropSource = { url: string; w: number; h: number };

async function decodeFile(file: File): Promise<CropSource> {
  if (file.size > 25_000_000) throw new Error("Image must be under 25 MB.");
  const heic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  let blob: Blob = file;
  if (heic) {
    try {
      const { default: heic2any } = await import("heic2any");
      const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      blob = Array.isArray(out) ? out[0] : out;
    } catch {
      /* Safari can decode HEIC natively */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const w = bmp.width;
    const h = bmp.height;
    bmp.close();
    if (Math.min(w, h) < TOKEN_ART_MIN_PX) {
      throw new Error("That image is too small. Use at least 64×64.");
    }
    return { url, w, h };
  } catch (e) {
    if (e instanceof Error && e.message.includes("too small")) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not read that image. Try another photo."));
    el.src = url;
  });
  if (Math.min(img.naturalWidth, img.naturalHeight) < TOKEN_ART_MIN_PX) {
    URL.revokeObjectURL(url);
    throw new Error("That image is too small. Use at least 64×64.");
  }
  return { url, w: img.naturalWidth, h: img.naturalHeight };
}

function jpegFit(canvas: HTMLCanvasElement, max = IMAGE_DATA_MAX): string {
  for (const q of [0.82, 0.7, 0.56, 0.42, 0.3]) {
    const data = canvas.toDataURL("image/jpeg", q);
    if (data.length <= max) return data;
  }
  const small = document.createElement("canvas");
  small.width = TOKEN_ART_STORE_PX;
  small.height = TOKEN_ART_STORE_PX;
  const sctx = small.getContext("2d");
  if (!sctx) throw new Error("Could not encode the image.");
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(canvas, 0, 0, TOKEN_ART_STORE_PX, TOKEN_ART_STORE_PX);
  for (const q of [0.72, 0.55, 0.4, 0.28]) {
    const data = small.toDataURL("image/jpeg", q);
    if (data.length <= max) return data;
  }
  throw new Error("Image is too heavy. Try a simpler photo.");
}

export async function readLaunchImage(file: File): Promise<CropSource> {
  return decodeFile(file);
}

export async function exportTokenJpeg(img: HTMLImageElement, rect: CropRect): Promise<string> {
  const full = document.createElement("canvas");
  full.width = TOKEN_ART_PX;
  full.height = TOKEN_ART_PX;
  const ctx = full.getContext("2d");
  if (!ctx) throw new Error("Could not crop image.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#04000a";
  ctx.fillRect(0, 0, TOKEN_ART_PX, TOKEN_ART_PX);
  ctx.drawImage(img, rect.x, rect.y, rect.size, rect.size, 0, 0, TOKEN_ART_PX, TOKEN_ART_PX);
  const store = document.createElement("canvas");
  store.width = TOKEN_ART_STORE_PX;
  store.height = TOKEN_ART_STORE_PX;
  const sctx = store.getContext("2d");
  if (!sctx) throw new Error("Could not crop image.");
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(full, 0, 0, TOKEN_ART_STORE_PX, TOKEN_ART_STORE_PX);
  return jpegFit(store);
}

export function TokenImageCrop({
  source,
  onCancel,
  onDone,
}: {
  source: CropSource;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const [rect, setRect] = useState<CropRect>(() => coverCrop(source.w, source.h));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; rect: CropRect } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const [view, setView] = useState(240);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setRect(coverCrop(source.w, source.h));
  }, [source.w, source.h, source.url]);

  useEffect(() => {
    const measure = () => setView(Math.min(300, Math.max(200, window.innerWidth - 48)));
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPos = document.body.style.position;
    const prevTop = document.body.style.top;
    const y = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPos;
      document.body.style.top = prevTop;
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, y);
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const stage = cropStageStyle(rect, source.w, source.h, view);
  const zoom = zoomOf(rect, source.w, source.h);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" && e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      /* continue */
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, rect };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const k = drag.current.rect.size / view;
    const dx = (drag.current.x - e.clientX) * k;
    const dy = (drag.current.y - e.clientY) * k;
    setRect(panCrop(drag.current.rect, source.w, source.h, dx, dy));
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const next = zoom * (e.deltaY > 0 ? 0.92 : 1.08);
    setRect(zoomCrop(rect, source.w, source.h, next));
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      pinch.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom,
      };
      drag.current = null;
    }
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault();
      const a = e.touches[0];
      const b = e.touches[1];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const next = pinch.current.zoom * (dist / Math.max(24, pinch.current.dist));
      setRect(zoomCrop(rect, source.w, source.h, next));
    }
  };

  const onTouchEnd = () => {
    pinch.current = null;
  };

  const confirm = useCallback(async () => {
    const img = imgRef.current;
    if (!img) return;
    setBusy(true);
    setErr("");
    try {
      if (!img.complete) await img.decode();
      onDone(await exportTokenJpeg(img, rect));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save that crop.");
      setBusy(false);
    }
  }, [onDone, rect]);

  const dialog = (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/85"
      role="dialog"
      aria-modal="true"
      aria-label="Crop token art"
      style={{ paddingTop: "max(12px, env(safe-area-inset-top))", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex min-h-[100dvh] items-center justify-center px-3 py-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0614] p-4 shadow-2xl sm:p-5">
        <p className="font-mono text-[11px] tracking-[0.28em] text-acid">TOKEN ART · 1:1 JPEG</p>
        <h3 className="mt-1 font-display text-2xl text-ghost">Frame the square</h3>
        <p className="mt-1 text-sm text-mute">Drag to pan. Pinch or use the slider to zoom. We save a JPEG wallets can show.</p>

        <div className="mt-4 flex items-center justify-center gap-4">
          <div
            ref={stageRef}
            className="relative max-w-full shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-void touch-none"
            style={{ width: view, height: view }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={source.url}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{ width: stage.width, height: stage.height, left: stage.left, top: stage.top }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-acid/40" />
            <div className="pointer-events-none absolute inset-3 rounded-full ring-1 ring-white/25" />
          </div>
          <div className="hidden flex-col items-center gap-2 sm:flex">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-white/15 bg-void">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={source.url}
                alt=""
                draggable={false}
                className="max-w-none"
                style={{ width: stage.width * (64 / view), height: stage.height * (64 / view), marginLeft: stage.left * (64 / view), marginTop: stage.top * (64 / view) }}
              />
            </div>
            <p className="font-mono text-[10px] text-mute">Phantom</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white" onClick={() => setRect(zoomCrop(rect, source.w, source.h, 1))}>
            Fit
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="h-9 w-9 rounded-full bg-white/10 text-lg text-white" onClick={() => setRect(zoomCrop(rect, source.w, source.h, zoom / 1.15))}>
              −
            </button>
            <span className="font-mono text-[12px] text-mute">{zoom.toFixed(1)}×</span>
            <button type="button" className="h-9 w-9 rounded-full bg-white/10 text-lg text-white" onClick={() => setRect(zoomCrop(rect, source.w, source.h, zoom * 1.15))}>
              +
            </button>
          </div>
        </div>

        {err ? <p className="mt-2 font-mono text-[11px] text-blood">{err}</p> : null}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} className="min-h-[44px] flex-1 rounded-full border border-white/15 px-4 text-sm text-mute">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={() => confirm().catch(() => {})} className="btn-acid min-h-[44px] flex-[1.4] rounded-full px-4 disabled:opacity-40">
            {busy ? "Saving…" : "Use this square"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}
