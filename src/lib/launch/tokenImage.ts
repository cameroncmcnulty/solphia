/** Square token art. Phantom, Jupiter, Dexscreener, and Pump all expect 1:1 JPEG/PNG. */
export const TOKEN_ART_PX = 1000;
export const TOKEN_ART_STORE_PX = 512;
export const TOKEN_ART_MIN_PX = 64;
export const TOKEN_ART_MAX_ZOOM = 6;

export type CropRect = { x: number; y: number; size: number };

export function clamp(n: number, lo: number, hi: number): number {
  if (hi < lo) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Cover crop at zoom=1: largest centered square. zoom > 1 tightens around the center. */
export function cropAt(w: number, h: number, zoom: number, cx: number, cy: number): CropRect {
  const base = Math.min(w, h);
  const z = clamp(zoom, 1, TOKEN_ART_MAX_ZOOM);
  const size = Math.max(1, base / z);
  const x = clamp(cx - size / 2, 0, Math.max(0, w - size));
  const y = clamp(cy - size / 2, 0, Math.max(0, h - size));
  return { x, y, size };
}

export function coverCrop(w: number, h: number): CropRect {
  return cropAt(w, h, 1, w / 2, h / 2);
}

export function panCrop(rect: CropRect, w: number, h: number, dx: number, dy: number): CropRect {
  return {
    size: rect.size,
    x: clamp(rect.x + dx, 0, Math.max(0, w - rect.size)),
    y: clamp(rect.y + dy, 0, Math.max(0, h - rect.size)),
  };
}

export function zoomCrop(rect: CropRect, w: number, h: number, nextZoom: number): CropRect {
  const cx = rect.x + rect.size / 2;
  const cy = rect.y + rect.size / 2;
  return cropAt(w, h, nextZoom, cx, cy);
}

export function zoomOf(rect: CropRect, w: number, h: number): number {
  const base = Math.min(w, h);
  if (!(base > 0) || !(rect.size > 0)) return 1;
  return clamp(base / rect.size, 1, TOKEN_ART_MAX_ZOOM);
}

/** CSS size/position so `rect` fills a square viewport of `view` pixels. */
export function cropStageStyle(rect: CropRect, w: number, h: number, view: number): { width: number; height: number; left: number; top: number } {
  const k = view / rect.size;
  const left = -rect.x * k;
  const top = -rect.y * k;
  return {
    width: w * k,
    height: h * k,
    left: left === 0 ? 0 : left,
    top: top === 0 ? 0 : top,
  };
}
