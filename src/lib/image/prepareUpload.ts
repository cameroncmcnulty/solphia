import { imageExt, isBrowserImage, SITE_IMAGE_MAX_BYTES, sniffImageMime } from "./sniff";

const PICK_MAX = 25_000_000;
const EDGE = 1600;

function heicName(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

async function heicToJpeg(file: File): Promise<Blob> {
  try {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return Array.isArray(out) ? out[0] : out;
  } catch {
    return file;
  }
}

async function decodeBitmap(blob: Blob): Promise<{ w: number; h: number; paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> {
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
    return {
      w: bmp.width,
      h: bmp.height,
      paint: (ctx, w, h) => {
        ctx.drawImage(bmp, 0, 0, w, h);
        bmp.close();
      },
    };
  } catch {
    /* fall through to HTMLImageElement */
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image. Try another photo."));
      el.src = url;
    });
    return {
      w: img.naturalWidth,
      h: img.naturalHeight,
      paint: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode that image."))),
      type,
      quality,
    );
  });
}

async function rasterize(blob: Blob): Promise<File> {
  const decoded = await decodeBitmap(blob);
  const scale = Math.min(1, EDGE / Math.max(decoded.w, decoded.h, 1));
  const w = Math.max(1, Math.round(decoded.w * scale));
  const h = Math.max(1, Math.round(decoded.h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  decoded.paint(ctx, w, h);
  for (const q of [0.92, 0.84, 0.72, 0.6, 0.48, 0.36]) {
    const out = await canvasToBlob(canvas, "image/jpeg", q);
    if (out.size <= SITE_IMAGE_MAX_BYTES) {
      return new File([out], "logo.jpg", { type: "image/jpeg" });
    }
  }
  throw new Error("Image is too heavy. Try a simpler photo.");
}

/** Decode any camera-roll type into a file browsers and the live site can show. */
export async function prepareSiteImage(file: File): Promise<File> {
  if (file.size < 32) throw new Error("That file is empty.");
  if (file.size > PICK_MAX) throw new Error("Image must be under 25 MB.");
  let blob: Blob = heicName(file) ? await heicToJpeg(file) : file;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mime = sniffImageMime(bytes, blob.type || file.type);
  if (!mime) throw new Error("Could not read that image. Try another photo.");
  if (isBrowserImage(mime) && bytes.byteLength <= SITE_IMAGE_MAX_BYTES) {
    const ext = imageExt(mime);
    return new File([blob], `logo.${ext}`, { type: mime });
  }
  return rasterize(blob);
}
